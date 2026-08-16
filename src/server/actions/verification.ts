"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";
import { fetchTextContent } from "@/lib/fetch-text";
import { verifyAll, verifySolution } from "@/server/judge0/verify";
import type { VerificationOutcome } from "@/server/judge0/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Loads the content needed to verify a problem. Text bodies live in
 * UploadThing behind URLs; only `solution` is stored inline.
 */
async function loadVerificationInput(problemId: number) {
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
    id: row.id,
    name: row.name,
    number: row.number,
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

/** Persists an outcome onto the problem row. */
async function persistOutcome(
  problemId: number,
  outcome: VerificationOutcome,
): Promise<void> {
  await db
    .update(problem)
    .set({
      verification_status: outcome.status,
      verification_message: outcome.message,
      verified_at: new Date(),
    })
    .where(eq(problem.id, problemId));
}

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export type VerifyProblemResult =
  | { success: true; outcome: VerificationOutcome }
  | { success: false; error: string };

export interface BulkVerifyEntry {
  problemId: number;
  name: string;
  number: number;
  status: VerificationOutcome["status"];
  message: string;
}

export type BulkVerifyResult =
  | {
      success: true;
      entries: BulkVerifyEntry[];
      summary: Record<VerificationOutcome["status"], number>;
    }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Re-runs the Judge0 check for a single existing problem and stores the result.
 */
export async function verifyProblemById(
  problemId: number,
): Promise<VerifyProblemResult> {
  try {
    const loaded = await loadVerificationInput(problemId);
    if (!loaded) return { success: false, error: "Problem not found." };

    const outcome = await verifySolution(loaded.input);
    await persistOutcome(problemId, outcome);

    return { success: true, outcome };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown verification error.",
    };
  }
}

/**
 * Verifies an explicit set of problems, or every problem when `problemIds` is
 * omitted. Runs with bounded concurrency and never aborts the batch on a
 * single failure — each problem records its own outcome.
 */
export async function verifyProblems(
  problemIds?: number[],
): Promise<BulkVerifyResult> {
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

    const entries: BulkVerifyEntry[] = [];

    await verifyAll(targets, async (target) => {
      const loaded = await loadVerificationInput(target.id);
      if (!loaded) return;

      const outcome = await verifySolution(loaded.input);
      await persistOutcome(target.id, outcome);

      entries.push({
        problemId: target.id,
        name: target.name,
        number: target.number,
        status: outcome.status,
        message: outcome.message,
      });
    });

    const summary = {
      unverified: 0,
      passed: 0,
      failed: 0,
      error: 0,
      skipped: 0,
    } as Record<VerificationOutcome["status"], number>;
    for (const e of entries) summary[e.status] += 1;

    entries.sort((a, b) => a.number - b.number);

    return { success: true, entries, summary };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown verification error.",
    };
  }
}

/** Verifies every problem belonging to a single competition. */
export async function verifyCompetitionProblems(
  competitionId: number,
): Promise<BulkVerifyResult> {
  try {
    const rows = await db
      .select({ id: problem.id })
      .from(problem)
      .where(eq(problem.competition, competitionId));

    return await verifyProblems(rows.map((r) => r.id));
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown verification error.",
    };
  }
}

/**
 * Verifies an unsaved problem straight from the competition editor, before it
 * has a database row. Used by the extraction review screen.
 */
export async function verifyDraftProblem(input: {
  solution: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  /** Used to synthesise the conventional `<problemname>.dat` input file. */
  problemName?: string;
  /** Problem 1 takes no input, so empty input data is allowed for it. */
  problemNumber?: number;
}): Promise<VerifyProblemResult> {
  try {
    const outcome = await verifySolution(input);
    return { success: true, outcome };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown verification error.",
    };
  }
}
