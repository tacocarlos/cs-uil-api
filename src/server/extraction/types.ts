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
 * Per-problem structured data returned by the Claude PDF extraction step.
 * Figure references use the placeholder format FIGURE_N (1-based within this problem).
 */
export interface PdfProblemExtraction {
  number: number;
  name: string;
  /** GitHub-flavoured markdown. Images appear as: ![alt](FIGURE_N) */
  markdown: string;
  /** Total number of figures/diagrams Claude identified in this problem */
  figureCount: number;
  studentOutput: string;
  studentInput: string;
}

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
   * Final markdown with FIGURE_N placeholders already replaced by
   * uploaded UploadThing URLs (or left as-is if no matching image was found).
   */
  markdown: string;
  /** The full student packet PDF URL (used as the pdf_url for each problem) */
  pdfUrl: string;
  /** Map of FIGURE_N placeholder → uploaded UploadThing URL */
  imageUrls: Record<string, string>;
}

export interface ExtractionResult {
  yearHint: number | null;
  levelHint: string | null;
  problems: ExtractedProblem[];
}
