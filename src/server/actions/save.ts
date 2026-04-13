"use server";

import { db } from "@/server/db";
import {
  competition as competitionTable,
  problem as problemTable,
} from "@/server/db/schemas/core-schema";
import {
  type CompetitionFormState,
  COMPETITION_LEVELS,
} from "@/components/admin/competition/types";

// ---------------------------------------------------------------------------
// Shared result types
// ---------------------------------------------------------------------------

export type CreateCompetitionResult =
  | { success: true; competitionId: number }
  | { success: false; error: string };

export type SaveProblemResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Phase 1 — create the competition row only (tiny payload ~500 B)
// ---------------------------------------------------------------------------

/**
 * Creates a single competition record and returns its new ID.
 *
 * This is phase 1 of a two-phase save that avoids hitting Vercel's 4.5 MB
 * server-action payload limit.  The old `saveCompetition(form, problems[])`
 * would serialize all 12 problems — each with potentially hundreds of KB of
 * judge test data — into one POST body and reliably exceeded the limit.
 */
export async function createCompetition(
  form: CompetitionFormState,
): Promise<CreateCompetitionResult> {
  // Validate year
  const year = parseInt(form.year, 10);
  if (isNaN(year) || year < 2000 || year > 2099) {
    return {
      success: false,
      error: "Year must be a number between 2000 and 2099.",
    };
  }

  // Validate level
  if (!(COMPETITION_LEVELS as readonly string[]).includes(form.level)) {
    return {
      success: false,
      error: `Level must be one of: ${COMPETITION_LEVELS.join(", ")}.`,
    };
  }
  const level = form.level as (typeof COMPETITION_LEVELS)[number];

  // Validate URLs
  if (!form.studentPacketUrl) {
    return { success: false, error: "Student packet URL is required." };
  }
  if (!form.dataZipUrl) {
    return { success: false, error: "Data ZIP URL is required." };
  }

  try {
    const [comp] = await db
      .insert(competitionTable)
      .values({
        year,
        level,
        enabled: form.enabled,
        student_packet_url: form.studentPacketUrl,
        data_zip_url: form.dataZipUrl,
      })
      .returning({ id: competitionTable.id });

    if (!comp?.id) {
      return { success: false, error: "Failed to create competition record." };
    }

    return { success: true, competitionId: comp.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

// ---------------------------------------------------------------------------
// The data needed for a single problem — no extra client-state fields
// ---------------------------------------------------------------------------

export interface ProblemToSave {
  name: string;
  number: number;
  markdown: string;
  pdfUrl: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  solution: string;
}

// ---------------------------------------------------------------------------
// Phase 2 — save one problem at a time (one request per problem, ~50–200 KB)
// ---------------------------------------------------------------------------

/**
 * Inserts a single problem row linked to `competitionId`.
 *
 * Called once per problem after `createCompetition` returns its ID.
 * Keeping the payload to one problem at a time ensures the request body
 * never approaches the 4.5 MB limit even for problems with large judge
 * test-data files.
 */
export async function saveProblem(
  competitionId: number,
  problem: ProblemToSave,
): Promise<SaveProblemResult> {
  try {
    await db.insert(problemTable).values({
      competition: competitionId,
      name: problem.name.slice(0, 128),
      number: problem.number,
      markdown: problem.markdown,
      pdf_url: problem.pdfUrl,
      student_data: problem.studentData,
      student_output: problem.studentOutput,
      test_data: problem.testData,
      test_output: problem.testOutput,
      solution: problem.solution,
      enabled: false,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
