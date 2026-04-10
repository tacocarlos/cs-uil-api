"use server";

import { db } from "@/server/db";
import {
  competition as competitionTable,
  problem as problemTable,
} from "@/server/db/schemas/core-schema";
import {
  type CompetitionFormState,
  type EditableProblem,
  COMPETITION_LEVELS,
} from "@/components/admin/competition/types";

export type SaveResult =
  | { success: true; competitionId: number }
  | { success: false; error: string };

export async function saveCompetition(
  form: CompetitionFormState,
  problems: EditableProblem[],
): Promise<SaveResult> {
  // 1. Validate year
  const year = parseInt(form.year, 10);
  if (isNaN(year) || year < 2000 || year > 2099) {
    return { success: false, error: "Year must be a number between 2000 and 2099." };
  }

  // 2. Validate level
  if (!(COMPETITION_LEVELS as readonly string[]).includes(form.level)) {
    return { success: false, error: `Level must be one of: ${COMPETITION_LEVELS.join(", ")}.` };
  }
  const level = form.level as (typeof COMPETITION_LEVELS)[number];

  // 3. Validate URLs
  if (!form.studentPacketUrl) {
    return { success: false, error: "Student packet URL is required." };
  }
  if (!form.dataZipUrl) {
    return { success: false, error: "Data ZIP URL is required." };
  }

  // 4–6. Insert competition and problems
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

    if (problems.length > 0) {
      await db.insert(problemTable).values(
        problems.map((p) => ({
          competition: comp.id,
          name: p.name.slice(0, 128),
          number: p.number,
          markdown: p.markdown,
          pdf_url: p.pdfUrl,
          student_data: p.studentData,
          student_output: p.studentOutput,
          test_data: p.testData,
          test_output: p.testOutput,
          solution: p.solution,
          enabled: false,
        })),
      );
    }

    // 7. Return success
    return { success: true, competitionId: comp.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
