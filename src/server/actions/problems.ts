"use server";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";

/**
 * Fetches all problems joined with their parent competition, returning a
 * flat projection suitable for the admin problems table.
 */
export async function getProblems() {
  return db
    .select({
      id: problem.id,
      name: problem.name,
      number: problem.number,
      enabled: problem.enabled,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      competitionId: competition.id,
      competitionLevel: competition.level,
      competitionYear: competition.year,
    })
    .from(problem)
    .innerJoin(competition, eq(problem.competition, competition.id))
    .orderBy(desc(competition.year), asc(problem.number));
}

/**
 * Returns aggregate statistics about the problems table:
 * - `total`    – total number of problems
 * - `enabled`  – number of enabled problems
 * - `disabled` – number of disabled problems
 * - `byLevel`  – problem count keyed by competition level
 */
export async function getProblemStats(): Promise<{
  total: number;
  enabled: number;
  disabled: number;
  byLevel: Record<string, number>;
}> {
  // Run the total and enabled counts in parallel.
  const [totalResult, enabledResult, levelResult] = await Promise.all([
    db.select({ count: count() }).from(problem),

    db
      .select({ count: count() })
      .from(problem)
      .where(eq(problem.enabled, true)),

    db
      .select({
        level: competition.level,
        count: count(problem.id),
      })
      .from(problem)
      .innerJoin(competition, eq(problem.competition, competition.id))
      .groupBy(competition.level),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const enabled = enabledResult[0]?.count ?? 0;
  const disabled = total - enabled;

  const byLevel: Record<string, number> = {};
  for (const row of levelResult) {
    // level is nullable in the schema (no .notNull()), guard defensively.
    if (row.level !== null && row.level !== undefined) {
      byLevel[row.level] = row.count;
    }
  }

  return { total, enabled, disabled, byLevel };
}

/**
 * Fetches only problems (and their competitions) that are both enabled.
 * Intended for the public-facing problems list.
 */
export async function getEnabledProblems() {
  return db
    .select({
      id: problem.id,
      name: problem.name,
      number: problem.number,
      enabled: problem.enabled,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      competitionId: competition.id,
      competitionLevel: competition.level,
      competitionYear: competition.year,
    })
    .from(problem)
    .innerJoin(competition, eq(problem.competition, competition.id))
    .where(and(eq(problem.enabled, true), eq(competition.enabled, true)))
    .orderBy(desc(competition.year), asc(problem.number));
}

/**
 * Fetches a single problem by its ID, joined with its parent competition.
 * Returns `null` when no matching row is found.
 */
export async function getProblemById(id: number) {
  const rows = await db
    .select({
      id: problem.id,
      name: problem.name,
      number: problem.number,
      markdown: problem.markdown,
      pdfUrl: problem.pdf_url,
      studentData: problem.student_data,
      studentOutput: problem.student_output,
      testData: problem.test_data,
      testOutput: problem.test_output,
      solution: problem.solution,
      enabled: problem.enabled,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      competitionId: competition.id,
      competitionLevel: competition.level,
      competitionYear: competition.year,
      competitionEnabled: competition.enabled,
    })
    .from(problem)
    .innerJoin(competition, eq(problem.competition, competition.id))
    .where(eq(problem.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Full detail shape returned by {@link getProblemById}. */
export type ProblemDetail = NonNullable<
  Awaited<ReturnType<typeof getProblemById>>
>;

/** Fields accepted by {@link updateProblem}. */
export interface UpdateProblemData {
  name: string;
  number: number;
  markdown: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  solution: string;
  enabled: boolean;
}

/**
 * Updates an existing problem row by ID.
 * Returns `{ success: true }` on success or `{ success: false, error }` on failure.
 */
export async function updateProblem(
  id: number,
  data: UpdateProblemData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db
      .update(problem)
      .set({
        name: data.name.slice(0, 128),
        number: data.number,
        markdown: data.markdown,
        student_data: data.studentData,
        student_output: data.studentOutput,
        test_data: data.testData,
        test_output: data.testOutput,
        solution: data.solution,
        enabled: data.enabled,
      })
      .where(eq(problem.id, id));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Deletes a problem row by ID.
 * Returns `{ success: true }` on success or `{ success: false, error }` on failure.
 */
export async function deleteProblem(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db.delete(problem).where(eq(problem.id, id));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
