"use server";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { problem } from "@/server/db/schemas/core-schema";
import { fetchTextContent } from "@/lib/fetch-text";
import { deleteUploadThingFiles, uploadTextFile } from "@/lib/upload-text";
import { generateOutputs } from "@/server/judge0/generate";
import type {
  GeneratedOutputKind,
  GenerateOutputsResult,
} from "@/server/judge0/generate";
import { verifyAll } from "@/server/judge0/verify";
import { previewText, type TextRef } from "@/lib/text-ref";
import {
  discardTextRefs,
  resolveTextRef,
  toOutgoingTextRef,
} from "@/lib/text-ref-server";

/**
 * Generating expected output runs the reference solution and captures what it
 * prints. Overwriting the stored expected output with that capture makes any
 * later verification tautological — the two can no longer disagree.
 *
 * So overwriting is always an explicit, previewed choice, and it resets the
 * problem's verification state to `unverified` with a note recording that the
 * outputs were derived from the solution rather than independently checked.
 */

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * A generated output as sent to the client. `output` and `existing` are
 * display previews (outputs can run to many MB); the full output is behind
 * `outputRef`, which is what gets applied.
 */
export type GeneratedOutputPreview = GenerateOutputsResult["outputs"][number] & {
  outputRef?: TextRef;
};

export interface GenerateOutputsPreviewResult
  extends Omit<GenerateOutputsResult, "outputs"> {
  outputs: GeneratedOutputPreview[];
}

export type GenerateOutputsActionResult =
  | { success: true; result: GenerateOutputsPreviewResult }
  | { success: false; error: string };

export type ApplyOutputsResult =
  | { success: true; applied: GeneratedOutputKind[] }
  | { success: false; error: string };

/** One changed output awaiting the admin's accept/deny decision. */
export interface OutputOverwriteProposal {
  problemId: number;
  name: string;
  number: number;
  kind: GeneratedOutputKind;
  /** Preview of the currently-stored expected output. */
  existing: string;
  /** Preview of what the solution produced. */
  output: string;
  /** The full produced output — pass this to `applyProblemOutputs`. */
  outputRef: TextRef;
}

export interface BulkOutputsEntry {
  problemId: number;
  name: string;
  number: number;
  /** Kinds that were produced but identical to what was already stored. */
  unchanged: GeneratedOutputKind[];
  /** Human-readable problems encountered, if any. */
  errors: string[];
}

export type BulkOutputsPreviewResult =
  | {
      success: true;
      /** Changed outputs, ordered by problem number; nothing has been written. */
      proposals: OutputOverwriteProposal[];
      entries: BulkOutputsEntry[];
      summary: { changed: number; unchanged: number; failed: number };
    }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Converts full generation results into client-sized previews. */
async function toPreview(
  result: GenerateOutputsResult,
  filePrefix: string,
): Promise<GenerateOutputsPreviewResult> {
  const outputs = await Promise.all(
    result.outputs.map(async (o): Promise<GeneratedOutputPreview> => ({
      ...o,
      existing: previewText(o.existing),
      ...(o.output !== undefined
        ? {
            output: previewText(o.output),
            outputRef: await toOutgoingTextRef(
              o.output,
              `${filePrefix}-${o.kind}-output.txt`,
            ),
          }
        : {}),
    })),
  );
  return { ...result, outputs };
}

async function loadGenerationInput(problemId: number) {
  const rows = await db
    .select({
      id: problem.id,
      name: problem.name,
      number: problem.number,
      solution: problem.solution,
      studentDataUrl: problem.student_data_url,
      studentOutputUrl: problem.student_output_url,
      testDataUrl: problem.test_data_url,
      testOutputUrl: problem.test_output_url,
    })
    .from(problem)
    .where(eq(problem.id, problemId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [studentData, studentOutput, testData, testOutput] = await Promise.all([
    fetchTextContent(row.studentDataUrl),
    fetchTextContent(row.studentOutputUrl),
    fetchTextContent(row.testDataUrl),
    fetchTextContent(row.testOutputUrl),
  ]);

  return {
    row,
    input: {
      solution: row.solution ?? "",
      studentData,
      studentOutput,
      testData,
      testOutput,
      problemName: row.name,
      problemNumber: row.number,
    },
  };
}

/**
 * Writes new expected-output files and repoints the problem at them.
 *
 * Upload happens before the DB write, and the superseded files are removed
 * only after the row has been updated, so a failure can never leave the
 * problem pointing at a deleted file.
 */
async function writeOutputs(
  problemId: number,
  outputs: { student?: TextRef; test?: TextRef },
): Promise<GeneratedOutputKind[]> {
  const current = await db
    .select({
      studentOutputUrl: problem.student_output_url,
      testOutputUrl: problem.test_output_url,
    })
    .from(problem)
    .where(eq(problem.id, problemId))
    .limit(1);

  const applied: GeneratedOutputKind[] = [];
  const updates: Record<string, string | null> = {};
  const superseded: Array<string | null> = [];

  // A URL ref was already uploaded during the preview, so it is adopted as
  // the stored file directly instead of being downloaded and re-uploaded.
  const store = (ref: TextRef, filename: string) =>
    "url" in ref ? Promise.resolve(ref.url) : uploadTextFile(ref.text, filename);

  if (outputs.student !== undefined) {
    updates.student_output_url = await store(
      outputs.student,
      `problem-${problemId}-student-output.txt`,
    );
    superseded.push(current[0]?.studentOutputUrl ?? null);
    applied.push("student");
  }

  if (outputs.test !== undefined) {
    updates.test_output_url = await store(
      outputs.test,
      `problem-${problemId}-test-output.txt`,
    );
    superseded.push(current[0]?.testOutputUrl ?? null);
    applied.push("test");
  }

  if (applied.length === 0) return applied;

  await db
    .update(problem)
    .set({
      ...updates,
      // The expected output now comes from the solution itself, so the prior
      // verification result no longer means anything.
      verification_status: "unverified",
      verification_message: `Expected output for ${applied.join(
        " and ",
      )} data was regenerated from the reference solution on ${new Date().toISOString()}. These outputs were derived from the solution, not independently verified against it.`,
      verified_at: null,
    })
    .where(eq(problem.id, problemId));

  // Best-effort cleanup, after the row is safely repointed.
  await deleteUploadThingFiles(superseded);

  return applied;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Runs the solution against the stored student and/or judge input and returns
 * what it produced. Writes nothing — this is the preview step.
 */
export async function generateProblemOutputs(
  problemId: number,
  kinds?: GeneratedOutputKind[],
): Promise<GenerateOutputsActionResult> {
  try {
    const loaded = await loadGenerationInput(problemId);
    if (!loaded) return { success: false, error: "Problem not found." };

    const result = await generateOutputs(loaded.input, { kinds });
    return {
      success: true,
      result: await toPreview(result, `problem-${problemId}-generated`),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown generation error.",
    };
  }
}

/**
 * Deletes uploaded generated outputs that the admin decided not to apply.
 * Inline refs need no cleanup and are ignored.
 */
export async function discardGeneratedOutputs(refs: TextRef[]): Promise<void> {
  await discardTextRefs(refs);
}

/**
 * Overwrites the stored expected output(s) with previously-previewed values.
 * Only the kinds present in `outputs` are touched.
 */
export async function applyProblemOutputs(
  problemId: number,
  outputs: { student?: TextRef; test?: TextRef },
): Promise<ApplyOutputsResult> {
  try {
    if (outputs.student === undefined && outputs.test === undefined) {
      return { success: false, error: "No outputs selected to overwrite." };
    }

    const exists = await db
      .select({ id: problem.id })
      .from(problem)
      .where(eq(problem.id, problemId))
      .limit(1);
    if (exists.length === 0) {
      return { success: false, error: "Problem not found." };
    }

    const applied = await writeOutputs(problemId, outputs);
    return { success: true, applied };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error writing outputs.",
    };
  }
}

/**
 * Generates outputs for many problems and returns the ones that would change.
 * Writes nothing — the admin accepts or denies each proposal individually,
 * and accepted ones are written through `applyProblemOutputs`.
 */
export async function previewOutputsForProblems(
  problemIds: number[] | undefined,
  kinds: GeneratedOutputKind[] = ["test", "student"],
): Promise<BulkOutputsPreviewResult> {
  try {
    const targets = await db
      .select({ id: problem.id, name: problem.name, number: problem.number })
      .from(problem)
      .where(
        problemIds && problemIds.length > 0
          ? inArray(problem.id, problemIds)
          : undefined,
      )
      .orderBy(asc(problem.number));

    const entries: BulkOutputsEntry[] = [];
    const proposals: OutputOverwriteProposal[] = [];

    await verifyAll(targets, async (target) => {
      const loaded = await loadGenerationInput(target.id);
      if (!loaded) return;

      const result = await generateOutputs(loaded.input, { kinds });

      const unchanged: GeneratedOutputKind[] = [];
      const errors: string[] = [];

      for (const output of result.outputs) {
        if (output.status === "error") {
          errors.push(`${output.kind}: ${output.message}`);
          continue;
        }
        if (output.status === "skipped" || output.output === undefined) continue;

        if (!output.differs) {
          unchanged.push(output.kind);
          continue;
        }
        proposals.push({
          problemId: target.id,
          name: target.name,
          number: target.number,
          kind: output.kind,
          existing: previewText(output.existing),
          output: previewText(output.output),
          outputRef: await toOutgoingTextRef(
            output.output,
            `problem-${target.id}-generated-${output.kind}-output.txt`,
          ),
        });
      }

      entries.push({
        problemId: target.id,
        name: target.name,
        number: target.number,
        unchanged,
        errors,
      });
    });

    entries.sort((a, b) => a.number - b.number);
    // Test before student within a problem, matching the dropdown order.
    proposals.sort(
      (a, b) =>
        a.number - b.number ||
        a.problemId - b.problemId ||
        (a.kind === b.kind ? 0 : a.kind === "test" ? -1 : 1),
    );

    const changedIds = new Set(proposals.map((p) => p.problemId));

    return {
      success: true,
      proposals,
      entries,
      summary: {
        changed: proposals.length,
        unchanged: entries.filter(
          (e) => !changedIds.has(e.problemId) && e.errors.length === 0,
        ).length,
        failed: entries.filter((e) => e.errors.length > 0).length,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error.",
    };
  }
}

/**
 * Generates outputs for an unsaved problem in the extraction review screen.
 * The caller merges the returned values into its own editor state.
 */
export async function generateDraftOutputs(input: {
  solution: string;
  studentData: TextRef;
  testData: TextRef;
  studentOutput?: TextRef;
  testOutput?: TextRef;
  problemName?: string;
  /** Problem 1 takes no input, so its output can be generated without any. */
  problemNumber?: number;
}): Promise<GenerateOutputsActionResult> {
  try {
    const [studentData, testData, studentOutput, testOutput] =
      await Promise.all([
        resolveTextRef(input.studentData),
        resolveTextRef(input.testData),
        resolveTextRef(input.studentOutput),
        resolveTextRef(input.testOutput),
      ]);
    const result = await generateOutputs({
      ...input,
      studentData,
      testData,
      studentOutput,
      testOutput,
    });
    return {
      success: true,
      result: await toPreview(result, "draft-generated"),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown generation error.",
    };
  }
}
