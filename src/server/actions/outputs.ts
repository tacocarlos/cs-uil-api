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

export type GenerateOutputsActionResult =
  | { success: true; result: GenerateOutputsResult }
  | { success: false; error: string };

export type ApplyOutputsResult =
  | { success: true; applied: GeneratedOutputKind[] }
  | { success: false; error: string };

export interface BulkOutputsEntry {
  problemId: number;
  name: string;
  number: number;
  /** Kinds that were regenerated and written. */
  applied: GeneratedOutputKind[];
  /** Kinds that were produced but identical to what was already stored. */
  unchanged: GeneratedOutputKind[];
  /** Human-readable problems encountered, if any. */
  errors: string[];
}

export type BulkOutputsResult =
  | {
      success: true;
      entries: BulkOutputsEntry[];
      summary: { applied: number; unchanged: number; failed: number };
    }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
  outputs: { student?: string; test?: string },
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

  if (outputs.student !== undefined) {
    updates.student_output_url = await uploadTextFile(
      outputs.student,
      `problem-${problemId}-student-output.txt`,
    );
    superseded.push(current[0]?.studentOutputUrl ?? null);
    applied.push("student");
  }

  if (outputs.test !== undefined) {
    updates.test_output_url = await uploadTextFile(
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
    return { success: true, result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown generation error.",
    };
  }
}

/**
 * Overwrites the stored expected output(s) with previously-previewed values.
 * Only the kinds present in `outputs` are touched.
 */
export async function applyProblemOutputs(
  problemId: number,
  outputs: { student?: string; test?: string },
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
 * Generates and immediately overwrites outputs for many problems.
 *
 * Only outputs that actually ran successfully are written; a problem whose
 * solution fails to compile keeps whatever it already had.
 */
export async function regenerateOutputsForProblems(
  problemIds: number[] | undefined,
  kinds: GeneratedOutputKind[] = ["test", "student"],
): Promise<BulkOutputsResult> {
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

    await verifyAll(targets, async (target) => {
      const loaded = await loadGenerationInput(target.id);
      if (!loaded) return;

      const result = await generateOutputs(loaded.input, { kinds });

      const toWrite: { student?: string; test?: string } = {};
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
        toWrite[output.kind] = output.output;
      }

      const applied =
        Object.keys(toWrite).length > 0
          ? await writeOutputs(target.id, toWrite)
          : [];

      entries.push({
        problemId: target.id,
        name: target.name,
        number: target.number,
        applied,
        unchanged,
        errors,
      });
    });

    entries.sort((a, b) => a.number - b.number);

    return {
      success: true,
      entries,
      summary: {
        applied: entries.filter((e) => e.applied.length > 0).length,
        unchanged: entries.filter(
          (e) => e.applied.length === 0 && e.errors.length === 0,
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
  studentData: string;
  testData: string;
  studentOutput?: string;
  testOutput?: string;
  problemName?: string;
  /** Problem 1 takes no input, so its output can be generated without any. */
  problemNumber?: number;
}): Promise<GenerateOutputsActionResult> {
  try {
    const result = await generateOutputs(input);
    return { success: true, result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown generation error.",
    };
  }
}
