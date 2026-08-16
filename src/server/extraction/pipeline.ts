import { extractZip, normalizeName } from "./zip-extractor";
import { extractPdfProblems } from "./pdf-extractor";
import { uploadImages } from "./image-uploader";
import { verifyAll, verifySolution } from "@/server/judge0/verify";
import type { ExtractedProblem, ExtractionResult } from "./types";

// ---------------------------------------------------------------------------
// runExtractionPipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full competition-packet extraction pipeline:
 *
 * 1. Fetches and parses the data ZIP and the student PDF **in parallel**.
 * 2. Uploads any images found in the ZIP to UploadThing.
 * 3. Resolves `FIGURE_N` placeholders in the Claude-generated markdown with
 *    the real uploaded URLs.
 * 4. Merges ZIP file data with PDF prose for every problem.
 * 5. Falls back gracefully when a problem exists only in one source.
 */
export async function runExtractionPipeline(
  params: {
    dataUrl: string;
    pdfUrl: string;
    zipFilename?: string;
    /**
     * Execute each extracted solution on Judge0 and compare its output to the
     * extracted expected output. Defaults to `true`; disable to skip the
     * (network-bound) verification phase.
     */
    verifySolutions?: boolean;
  },
  onProgress: (message: string, percent: number) => void = () => {},
): Promise<ExtractionResult> {
  let reported = 0;

  onProgress("Starting extraction pipeline…", Math.max(reported, 5));
  reported = Math.max(reported, 5);

  // -------------------------------------------------------------------------
  // 1. Run ZIP extraction and PDF extraction in parallel
  // -------------------------------------------------------------------------
  onProgress(
    "Downloading data archive and fetching PDF…",
    Math.max(reported, 10),
  );
  reported = Math.max(reported, 10);

  const [zipResult, pdfResult] = await Promise.all([
    (async () => {
      const result = await extractZip(params.dataUrl, params.zipFilename);
      onProgress("Data archive extracted", Math.max(reported, 30));
      reported = Math.max(reported, 30);
      return result;
    })(),
    (async () => {
      onProgress(
        "Analysing PDF with Claude AI — this may take a minute…",
        Math.max(reported, 15),
      );
      reported = Math.max(reported, 15);
      const result = await extractPdfProblems(params.pdfUrl);
      onProgress("AI extraction complete", Math.max(reported, 72));
      reported = Math.max(reported, 72);
      return result;
    })(),
  ]);

  // -------------------------------------------------------------------------
  // 2. Build lookup maps from PDF results.
  //    Primary key: normalized name  (handles spacing/casing differences between
  //    the ZIP filename and the PDF heading, e.g. "LinkedList" ↔ "Linked List").
  //    Fallback key: problem number  (used when names don't match).
  // -------------------------------------------------------------------------
  const pdfByName = new Map(
    pdfResult.problems.map((p) => [normalizeName(p.name), p] as const),
  );
  const pdfByNumber = new Map(
    pdfResult.problems.map((p) => [p.number, p] as const),
  );

  // -------------------------------------------------------------------------
  // 3. Determine metadata — PDF hints take priority over ZIP filename hints
  // -------------------------------------------------------------------------
  const yearHint = pdfResult.yearHint ?? zipResult.yearHint;
  const levelHint = pdfResult.levelHint ?? zipResult.levelHint;

  // -------------------------------------------------------------------------
  // 4. Process problems that have ZIP data
  // -------------------------------------------------------------------------
  const problems: ExtractedProblem[] = [];
  const processedNumbers = new Set<number>();

  onProgress("Uploading embedded images…", Math.max(reported, 80));
  reported = Math.max(reported, 80);

  for (const rawProblem of zipResult.problems) {
    // a. Upload all images found in this problem's directory
    const uploadedImages = await uploadImages(rawProblem.images);

    // b. Build FIGURE_N → uploaded-URL map (1-based index per problem)
    const imagePlaceholderMap: Record<string, string> = {};
    uploadedImages.forEach((img, i) => {
      imagePlaceholderMap[`FIGURE_${i + 1}`] = img.url;
    });

    // c. Look up the PDF extraction data — name-based match first, then number.
    const pdfData =
      pdfByName.get(normalizeName(rawProblem.name)) ??
      pdfByNumber.get(rawProblem.number);

    // d. Start with the PDF markdown, or a stub if the PDF missed this problem
    let markdown =
      pdfData?.markdown ??
      `# Problem ${rawProblem.number}\n\n*PDF content not extracted.*`;

    // e. Replace every (FIGURE_N) placeholder token with the real URL
    for (const [placeholder, url] of Object.entries(imagePlaceholderMap)) {
      markdown = markdown.replaceAll(`(${placeholder})`, `(${url})`);
    }

    // f. Push the fully-assembled ExtractedProblem.
    //    Use the PDF's problem number as canonical (document order) when
    //    available; fall back to the ZIP's alphabetical index otherwise.
    const canonicalNumber = pdfData?.number ?? rawProblem.number;

    problems.push({
      number: canonicalNumber,
      name: pdfData?.name ?? rawProblem.name,
      // Prefer the ZIP's StudentData file (authoritative, not OCR'd).
      // Fall back to what Claude extracted from the PDF.
      studentData: rawProblem.studentData || pdfData?.studentInput || "",
      studentOutput: rawProblem.studentOutput || pdfData?.studentOutput || "",
      testData: rawProblem.testData,
      testOutput: rawProblem.testOutput,
      solution: rawProblem.solution,
      markdown,
      imageUrls: imagePlaceholderMap,
    });

    processedNumbers.add(canonicalNumber);
  }

  onProgress("Assembling competition data…", Math.max(reported, 92));
  reported = Math.max(reported, 92);

  // -------------------------------------------------------------------------
  // 5. Process PDF-only problems (PDF found them but the ZIP had no data)
  // -------------------------------------------------------------------------
  for (const pdfProblem of pdfResult.problems) {
    if (!processedNumbers.has(pdfProblem.number)) {
      problems.push({
        number: pdfProblem.number,
        name: pdfProblem.name,
        studentData: pdfProblem.studentInput,
        studentOutput: pdfProblem.studentOutput,
        testData: "",
        testOutput: "",
        solution: "",
        markdown: pdfProblem.markdown,
        imageUrls: {},
      });
    }
  }

  // -------------------------------------------------------------------------
  // 6. Sort all problems by number ascending
  // -------------------------------------------------------------------------
  problems.sort((a, b) => a.number - b.number);

  // -------------------------------------------------------------------------
  // 7. Verify each solution on Judge0.
  //
  //    Extraction is heuristic — the judge data and the solution come from two
  //    different sources (ZIP vs. AI-parsed PDF), so a mismatch here is the
  //    strongest signal that a problem was assembled incorrectly and needs a
  //    human to look at it before it is published.
  //
  //    Runs with bounded concurrency and never throws: a verification outage
  //    must not lose an otherwise-successful extraction.
  // -------------------------------------------------------------------------
  if (params.verifySolutions !== false && problems.length > 0) {
    onProgress("Verifying solutions against judge data…", Math.max(reported, 94));
    reported = Math.max(reported, 94);

    let completed = 0;
    await verifyAll(problems, async (p) => {
      p.verification = await verifySolution({
        solution: p.solution,
        studentData: p.studentData,
        studentOutput: p.studentOutput,
        testData: p.testData,
        testOutput: p.testOutput,
        problemName: p.name,
        problemNumber: p.number,
      });

      completed += 1;
      onProgress(
        `Verified ${completed}/${problems.length} solutions…`,
        Math.min(98, 94 + Math.round((completed / problems.length) * 4)),
      );
    });
  }

  onProgress("Extraction complete", Math.max(reported, 99));
  reported = Math.max(reported, 99);

  // -------------------------------------------------------------------------
  // 8. Return the complete extraction result
  // -------------------------------------------------------------------------
  return { yearHint, levelHint, problems };
}
