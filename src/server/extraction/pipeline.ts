import { extractZip, normalizeName } from "./zip-extractor";
import { extractPdfProblems } from "./pdf-extractor";
import { uploadImages } from "./image-uploader";
import type { UploadedImage } from "./image-uploader";
import { verifyAll, verifySolution } from "@/server/judge0/verify";
import type {
  ExtractedProblem,
  ExtractionEvent,
  ExtractionProblemProgress,
  ExtractionResult,
} from "./types";

// ---------------------------------------------------------------------------
// runExtractionPipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full competition-packet extraction pipeline:
 *
 * 1. Fetches and parses the data ZIP and the student PDF **in parallel**.
 * 2. Uploads any images found in the ZIP to UploadThing as soon as the ZIP is
 *    read, so the uploads overlap the (much slower) PDF extraction.
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
  emit: (event: ExtractionEvent) => void = () => {},
): Promise<ExtractionResult> {
  // The overall bar tracks the PDF, which dominates the runtime; the ZIP and
  // image work report through their own steps instead.
  let reported = 0;
  const progress = (message: string, percent: number) => {
    reported = Math.max(reported, percent);
    emit({ type: "progress", message, percent: reported });
  };

  progress("Downloading data archive and student packet…", 5);

  // -------------------------------------------------------------------------
  // 1. ZIP (+ image uploads) and PDF extraction, in parallel
  // -------------------------------------------------------------------------
  const zipTask = (async () => {
    emit({ type: "step", id: "zip", status: "active" });
    const zip = await extractZip(params.dataUrl, params.zipFilename);
    emit({
      type: "step",
      id: "zip",
      status: "done",
      detail: `${zip.problems.length} problem${zip.problems.length === 1 ? "" : "s"}`,
    });

    // Images only depend on the ZIP, so upload them now rather than after the
    // PDF finishes. All problems upload concurrently.
    const imageCount = zip.problems.reduce((n, p) => n + p.images.length, 0);
    const imageDetail =
      imageCount === 0
        ? "No images"
        : `${imageCount} image${imageCount === 1 ? "" : "s"}`;
    emit({ type: "step", id: "images", status: "active", detail: imageDetail });
    const uploads: UploadedImage[][] = await Promise.all(
      zip.problems.map((p) => uploadImages(p.images)),
    );
    emit({ type: "step", id: "images", status: "done", detail: imageDetail });

    return { zip, uploads };
  })();

  const pdfTask = (async () => {
    emit({ type: "step", id: "scan", status: "active" });
    progress("Scanning the student packet for problems…", 8);

    // Per-problem state, re-sent as a snapshot whenever it changes.
    const tracked: ExtractionProblemProgress[] = [];
    const sendProblems = () =>
      emit({ type: "problems", problems: tracked.map((p) => ({ ...p })) });
    const setStatus = (
      number: number,
      status: ExtractionProblemProgress["status"],
    ) => {
      const entry = tracked.find((p) => p.number === number);
      if (!entry || entry.status === status) return;
      entry.status = status;
      sendProblems();
    };
    const doneCount = () => tracked.filter((p) => p.status === "done").length;

    // Extraction spans 15–92% of the bar, advancing one step per problem.
    const extractPercent = () =>
      tracked.length === 0
        ? 15
        : 15 + Math.round((doneCount() / tracked.length) * (92 - 15));

    const result = await extractPdfProblems(params.pdfUrl, {
      onScanProgress: (count) => {
        emit({
          type: "step",
          id: "scan",
          status: "active",
          detail: `${count} found`,
        });
      },
      onScanned: (found) => {
        emit({
          type: "step",
          id: "scan",
          status: "done",
          detail: `${found.length} problem${found.length === 1 ? "" : "s"}`,
        });
        tracked.push(
          ...found.map((p) => ({ ...p, status: "pending" as const })),
        );
        sendProblems();
        emit({
          type: "step",
          id: "extract",
          status: "active",
          detail: `0/${found.length}`,
        });
        progress(`Extracting ${found.length} problems with Claude…`, 15);
      },
      onProblemWriting: (number) => {
        setStatus(number, "writing");
        const name = tracked.find((p) => p.number === number)?.name;
        if (name) progress(`Extracting ${name}…`, extractPercent());
      },
      onProblemDone: (number) => {
        setStatus(number, "done");
        const name = tracked.find((p) => p.number === number)?.name;
        emit({
          type: "step",
          id: "extract",
          status: "active",
          detail: `${doneCount()}/${tracked.length}`,
        });
        if (name) {
          progress(
            `Processed ${name} [${doneCount()}/${tracked.length}]`,
            extractPercent(),
          );
        }
      },
    });

    emit({
      type: "step",
      id: "extract",
      status: "done",
      detail: `${result.problems.length}/${tracked.length || result.problems.length}`,
    });
    return result;
  })();

  const [{ zip: zipResult, uploads }, pdfResult] = await Promise.all([
    zipTask,
    pdfTask,
  ]);

  emit({ type: "step", id: "assemble", status: "active" });
  progress("Assembling competition…", 93);

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

  for (const [zipIndex, rawProblem] of zipResult.problems.entries()) {
    // a. Images were uploaded alongside the PDF extraction
    const uploadedImages = uploads[zipIndex] ?? [];

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
    progress("Verifying solutions against judge data…", 94);

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
      progress(
        `Verified ${completed}/${problems.length} solutions…`,
        Math.min(98, 94 + Math.round((completed / problems.length) * 4)),
      );
    });
  }

  emit({ type: "step", id: "assemble", status: "done" });
  progress("Extraction complete", 99);

  // -------------------------------------------------------------------------
  // 8. Return the complete extraction result
  // -------------------------------------------------------------------------
  return { yearHint, levelHint, problems };
}
