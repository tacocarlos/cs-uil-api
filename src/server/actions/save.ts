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
import { uploadTextFile } from "@/lib/upload-text";

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

export type ProblemToSave = {
  name: string;
  number: number;
  problem_text_url: string | null;
  // pdfUrl removed — pdf_url column was dropped from the schema
  student_data_url: string | null;
  student_output_url: string | null;
  test_data_url: string | null;
  test_output_url: string | null;
  solution: string;
  enabled: boolean;
};

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
    // Upload each text field to UploadThing. Returns null for empty fields.
    // const [
    //   problemTextUrl,
    //   studentDataUrl,
    //   studentOutputUrl,
    //   testDataUrl,
    //   testOutputUrl,
    // ] = await Promise.all([
    //   uploadTextFile(
    //     problem.markdown,
    //     `comp-${competitionId}-p${problem.number}-markdown.md`,
    //   ),
    //   uploadTextFile(
    //     problem.studentData,
    //     `comp-${competitionId}-p${problem.number}-student-data.dat`,
    //   ),
    //   uploadTextFile(
    //     problem.studentOutput,
    //     `comp-${competitionId}-p${problem.number}-student-output.out`,
    //   ),
    //   uploadTextFile(
    //     problem.testData,
    //     `comp-${competitionId}-p${problem.number}-test-data.dat`,
    //   ),
    //   uploadTextFile(
    //     problem.testOutput,
    //     `comp-${competitionId}-p${problem.number}-test-output.out`,
    //   ),
    // ]);

    await db.insert(problemTable).values({
      competition: competitionId,
      name: problem.name.slice(0, 128),
      number: problem.number,
      problem_text_url: problem.problem_text_url,
      student_data_url: problem.student_data_url,
      student_output_url: problem.student_output_url,
      test_data_url: problem.test_data_url,
      test_output_url: problem.test_output_url,
      solution: problem.solution,
      enabled: problem.enabled,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

// ---------------------------------------------------------------------------
// createBlankProblem — add a new empty problem to an existing competition
// ---------------------------------------------------------------------------

/**
 * Inserts a minimal problem row for an existing competition and returns the
 * new row's ID so the caller can navigate straight to the problem edit page.
 *
 * All content fields (URLs) are left null; the user fills them in via the
 * problem editor.
 */
export async function createBlankProblem(
  competitionId: number,
  number: number,
): Promise<
  { success: true; problemId: number } | { success: false; error: string }
> {
  try {
    const [row] = await db
      .insert(problemTable)
      .values({
        competition: competitionId,
        name: `Problem ${number}`,
        number,
        solution: "",
        enabled: false,
      })
      .returning({ id: problemTable.id });

    if (!row?.id) {
      return { success: false, error: "Failed to create problem record." };
    }
    return { success: true, problemId: row.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown database error.",
    };
  }
}
