/**
 * A problem's raw files extracted from the data ZIP archive.
 * All text fields are already decoded as UTF-8 strings.
 */
export interface RawProblemFiles {
  /** 1-based problem number derived from the directory/file name */
  number: number;
  /** Best-effort display name derived from the directory name (before PDF parsing) */
  name: string;
  studentData: string; // sample input from StudentData folder (.dat file)
  studentOutput: string; // always "" from ZIP (UIL doesn't ship student output files)
  testData: string;
  testOutput: string;
  /** Solution source code (Java for UIL, may be other languages) */
  solution: string;
  /** Any image files found inside this problem's directory */
  images: Array<{
    filename: string;
    data: Buffer;
    mimeType: string;
  }>;
}

/**
 * Where a figure sits in the student packet, as reported by the model.
 * Used to render a screenshot of it.
 */
export interface FigureLocation {
  /** N in this figure's uil-cs-api-figure:N placeholder */
  figure: number;
  /** 1-based page index within the PDF file */
  page: number;
  /** Bounding box on a 0–1000 grid over the page, origin top-left */
  box: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Per-problem structured data returned by the Claude PDF extraction step.
 * Figure references use the placeholder format uil-cs-api-figure:N (1-based within this problem).
 */
export interface PdfProblemExtraction {
  number: number;
  name: string;
  /** GitHub-flavoured markdown. Images appear as: ![alt](uil-cs-api-figure:N) */
  markdown: string;
  /** Location of every figure Claude identified in this problem */
  figures: FigureLocation[];
  studentOutput: string;
  studentInput: string;
}

import type { VerificationOutcome } from "@/server/judge0/types";
import type { ProblemImage } from "@/lib/problem-images";

/**
 * A single fully-resolved problem ready for the competition editor.
 */
export interface ExtractedProblem {
  number: number;
  name: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  solution: string;
  /**
   * Problem markdown. Figures stay as uil-cs-api-figure:N placeholders; `images` holds
   * the uploaded file for each one.
   */
  markdown: string;
  /** Uploaded figures, one per placeholder that could be filled */
  images: ProblemImage[];
  /**
   * Result of running `solution` against the extracted judge data on Judge0.
   * `undefined` when verification was not requested for this run.
   */
  verification?: VerificationOutcome;
}

export interface ExtractionResult {
  yearHint: number | null;
  levelHint: string | null;
  problems: ExtractedProblem[];
}

// ---------------------------------------------------------------------------
// Live progress events (streamed to the loader over SSE)
// ---------------------------------------------------------------------------

/**
 * Pipeline stages shown in the loader. ZIP reading and image upload run in
 * parallel with the PDF stages, so each step reports its own state rather
 * than being inferred from a single percentage.
 */
export type ExtractionStepId = "zip" | "images" | "scan" | "extract" | "assemble";

export type ExtractionStepStatus = "active" | "done";

/** Where one problem is in the PDF extraction. */
export type ExtractionProblemStatus = "pending" | "writing" | "done";

export interface ExtractionProblemProgress {
  number: number;
  name: string;
  status: ExtractionProblemStatus;
}

export type ExtractionEvent =
  | { type: "progress"; message: string; percent: number }
  | {
      type: "step";
      id: ExtractionStepId;
      status: ExtractionStepStatus;
      /** Short count/summary shown beside the step, e.g. "12 problems". */
      detail?: string;
    }
  /** Full snapshot of per-problem PDF extraction state. */
  | { type: "problems"; problems: ExtractionProblemProgress[] };
