"use server";

import { runExtractionPipeline } from "@/server/extraction/pipeline";
import type { ExtractionResult } from "@/server/extraction/types";

export interface ExtractCompetitionParams {
  dataUrl: string;
  pdfUrl: string;
  /** Original ZIP filename, used to infer year/level as a fallback */
  zipFilename?: string;
  /**
   * Run each extracted solution on Judge0 and compare against the extracted
   * expected output. Defaults to `true`.
   */
  verifySolutions?: boolean;
}

/**
 * Server action — orchestrates the full extraction pipeline.
 * Called from the /admin/competitions/add page once it loads.
 */
export async function extractCompetition(
  params: ExtractCompetitionParams,
): Promise<ExtractionResult> {
  return runExtractionPipeline(params);
}
