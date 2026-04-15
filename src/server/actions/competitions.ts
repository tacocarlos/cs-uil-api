"use server";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";
import { deleteUploadThingFiles } from "@/lib/upload-text";
import { cache } from "react";

/**
 * Fetches every competition row, returning all columns.
 * Suitable for populating admin dropdowns, tables, and stats.
 */
export async function getCompetitions() {
  return db.select().from(competition);
}

/** A single row returned by {@link getCompetitions}. */
export type CompetitionRow = Awaited<
  ReturnType<typeof getCompetitions>
>[number];

/**
 * Fetches a single competition row by its ID.
 * Returns `null` when no matching row is found.
 */
export async function getCompetitionById(id: number) {
  const rows = await db
    .select()
    .from(competition)
    .where(eq(competition.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetches a competition by ID together with all of its associated problems,
 * ordered by problem number ascending.
 */
export const getCompetitionWithProblems = cache(async (id: number) => {
  const [comp, problems] = await Promise.all([
    getCompetitionById(id),
    db
      .select({
        id: problem.id,
        name: problem.name,
        number: problem.number,
        enabled: problem.enabled,
      })
      .from(problem)
      .where(eq(problem.competition, id))
      .orderBy(asc(problem.number)),
  ]);
  return { competition: comp, problems };
});

/** Shape returned by {@link getCompetitionWithProblems}. */
export type CompetitionWithProblems = Awaited<
  ReturnType<typeof getCompetitionWithProblems>
>;

/** Fields accepted by {@link updateCompetition}. */
export interface UpdateCompetitionData {
  level: string;
  year: number;
  enabled: boolean;
}

/**
 * Updates an existing competition row by ID.
 * Returns `{ success: true }` on success or `{ success: false, error }` on failure.
 */
export async function updateCompetition(
  id: number,
  data: UpdateCompetitionData,
): Promise<{ success: true } | { success: false; error: string }> {
  const validLevels = [
    "invA",
    "invB",
    "district",
    "state",
    "region",
    "custom",
  ] as const;
  if (!validLevels.includes(data.level as (typeof validLevels)[number])) {
    return { success: false, error: `Invalid level: ${data.level}` };
  }
  try {
    await db
      .update(competition)
      .set({
        level: data.level as (typeof validLevels)[number],
        year: data.year,
        enabled: data.enabled,
      })
      .where(eq(competition.id, id));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Toggles the `enabled` flag on a single problem row.
 * Returns `{ success: true }` on success or `{ success: false, error }` on failure.
 */
export async function updateProblemEnabled(
  id: number,
  enabled: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db.update(problem).set({ enabled }).where(eq(problem.id, id));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Sets the `enabled` flag on every problem in a competition in one query.
 * Returns `{ success: true }` on success or `{ success: false, error }` on failure.
 */
export async function setAllProblemsEnabled(
  competitionId: number,
  enabled: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await db
      .update(problem)
      .set({ enabled })
      .where(eq(problem.competition, competitionId));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Deletes a competition and every problem that belongs to it, and removes
 * all associated UploadThing files.
 *
 * The DB rows are deleted first so that a UploadThing failure never blocks
 * the records from being removed.  File cleanup is best-effort.
 */
export async function deleteCompetition(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Fetch all problem URL fields before deletion so we know what to clean up.
    const problemRows = await db
      .select({
        problemTextUrl: problem.problem_text_url,
        studentDataUrl: problem.student_data_url,
        studentOutputUrl: problem.student_output_url,
        testDataUrl: problem.test_data_url,
        testOutputUrl: problem.test_output_url,
      })
      .from(problem)
      .where(eq(problem.competition, id));

    // Delete DB rows first.
    await db.delete(problem).where(eq(problem.competition, id));
    await db.delete(competition).where(eq(competition.id, id));

    // Best-effort UploadThing cleanup — collect every URL across all problems.
    const allUrls = problemRows.flatMap((p) => [
      p.problemTextUrl,
      p.studentDataUrl,
      p.studentOutputUrl,
      p.testDataUrl,
      p.testOutputUrl,
    ]);
    await deleteUploadThingFiles(allUrls);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Returns every competition row enriched with two problem-count fields.
 * Results are ordered newest-first (year DESC).
 */
export async function getCompetitionsWithCounts() {
  const [comps, totalCounts, enabledCounts] = await Promise.all([
    db.select().from(competition).orderBy(asc(competition.year)),
    db
      .select({ competitionId: problem.competition, n: count(problem.id) })
      .from(problem)
      .groupBy(problem.competition),
    db
      .select({ competitionId: problem.competition, n: count(problem.id) })
      .from(problem)
      .where(eq(problem.enabled, true))
      .groupBy(problem.competition),
  ]);

  const totalMap = new Map(totalCounts.map((r) => [r.competitionId, r.n]));
  const enabledMap = new Map(enabledCounts.map((r) => [r.competitionId, r.n]));

  return comps.map((c) => ({
    ...c,
    totalProblems: totalMap.get(c.id) ?? 0,
    enabledProblems: enabledMap.get(c.id) ?? 0,
  }));
}

export type CompetitionWithCounts = Awaited<
  ReturnType<typeof getCompetitionsWithCounts>
>[number];
