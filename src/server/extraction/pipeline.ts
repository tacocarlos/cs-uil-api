import { extractZip, normalizeName } from "./zip-extractor";
import { extractPdfProblems } from "./pdf-extractor";
import { captureFigures, type CapturedFigure } from "./figure-capture";
import { uploadImages, type ImageToUpload } from "./image-uploader";
import { verifyAll, verifySolution } from "@/server/judge0/verify";
import { placeholdersIn } from "@/lib/problem-images";
import type {
  ExtractedProblem,
  ExtractionEvent,
  ExtractionProblemProgress,
  ExtractionResult,
  RawProblemFiles,
} from "./types";

/**
 * The images to upload for one problem: every figure screenshotted from the
 * PDF, then ZIP images for any placeholders still unfilled, in order.
 *
 * The PDF screenshots come first because each one was located for a specific
 * placeholder. ZIP images carry no such link, so they only fill the gaps.
 * Images for placeholders that are not in the markdown are dropped.
 */
function figuresFor(
  markdown: string,
  captured: CapturedFigure[],
  zipImages: RawProblemFiles["images"],
): ImageToUpload[] {
  const wanted = placeholdersIn(markdown);
  const fromPdf = captured.filter((f) => wanted.includes(f.placeholder));
  const filled = new Set(fromPdf.map((f) => f.placeholder));
  const fromZip = wanted
    .filter((placeholder) => !filled.has(placeholder))
    .slice(0, zipImages.length)
    .map((placeholder, i) => ({
      ...zipImages[i]!,
      placeholder,
      width: null,
      height: null,
    }));
  return [...fromPdf, ...fromZip];
}

// ---------------------------------------------------------------------------
// runExtractionPipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full competition-packet extraction pipeline:
 *
 * 1. Fetches and parses the data ZIP and the student PDF **in parallel**.
 * 2. Screenshots each figure out of the PDF at the location Claude reported
 *    for its `uil-cs-api-figure:N` placeholder, and uploads it to UploadThing. The
 *    markdown keeps the placeholders; each problem's `images` maps them to
 *    the uploaded files.
 * 3. Merges ZIP file data with PDF prose for every problem.
 * 4. Falls back gracefully when a problem exists only in one source.
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
  // The overall bar tracks the PDF, which dominates the runtime; the ZIP
  // reports through its own step instead.
  let reported = 0;
  const progress = (message: string, percent: number) => {
    reported = Math.max(reported, percent);
    emit({ type: "progress", message, percent: reported });
  };

  progress("Downloading data archive and student packet…", 5);

  // -------------------------------------------------------------------------
  // 1. ZIP and PDF extraction, in parallel
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
    return zip;
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

  const [zipResult, pdfResult] = await Promise.all([zipTask, pdfTask]);

  // -------------------------------------------------------------------------
  // 1b. Screenshot each located figure out of the PDF. The uploads happen
  //     once each problem is assembled (step 5b).
  //
  //    A failure here must not lose the extraction: the placeholders stay in
  //    the markdown, and the admin can upload the figures by hand.
  // -------------------------------------------------------------------------
  emit({ type: "step", id: "images", status: "active" });
  progress("Capturing figures…", 92);

  let captured = new Map<number, CapturedFigure[]>();
  try {
    captured = await captureFigures(
      pdfResult.pdf,
      pdfResult.problems.map((p) => ({ number: p.number, figures: p.figures })),
    );
  } catch (error) {
    console.error("[extract] figure capture failed:", error);
  }

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
  /** Figures to upload, filled into each problem's `images` afterwards. */
  const pendingImages: Array<{ problem: ExtractedProblem; files: ImageToUpload[] }> =
    [];

  // UIL data ZIPs also ship alternate solutions ("EsquieAlt1", "CleaAlt")
  // and practice problems ("DryRun") that have no page in the packet. Their
  // ZIP number is just an alphabetical index, so the number fallback below is
  // reserved for PDF problems no ZIP entry matched by name; otherwise these
  // extras would be paired with, and duplicate, real problems.
  const nameMatched = new Set(
    zipResult.problems
      .map((raw) => pdfByName.get(normalizeName(raw.name))?.number)
      .filter((n) => n !== undefined),
  );
  const isAlternate = (raw: RawProblemFiles) =>
    pdfResult.problems.some((p) =>
      new RegExp(`^${normalizeName(p.name)}alt\\d*$`).test(normalizeName(raw.name)),
    );
  // ZIP-only problems are numbered after the packet's, so they never collide.
  let nextExtraNumber =
    Math.max(0, ...pdfResult.problems.map((p) => p.number)) + 1;

  for (const rawProblem of zipResult.problems) {
    // a. Look up the PDF extraction data — name-based match first, then number.
    const byNumber = pdfByNumber.get(rawProblem.number);
    const pdfData =
      pdfByName.get(normalizeName(rawProblem.name)) ??
      (byNumber && !nameMatched.has(byNumber.number) ? byNumber : undefined);
    if (!pdfData && isAlternate(rawProblem)) continue;
    if (byNumber && pdfData === byNumber) nameMatched.add(byNumber.number);

    // b. Start with the PDF markdown, or a stub if the PDF missed this problem
    const markdown =
      pdfData?.markdown ??
      `# Problem ${rawProblem.number}\n\n*PDF content not extracted.*`;

    // c. Push the fully-assembled ExtractedProblem.
    //    Use the PDF's problem number as canonical (document order) when
    //    available; fall back to the ZIP's alphabetical index otherwise.
    const canonicalNumber = pdfData?.number ?? nextExtraNumber++;

    const assembled: ExtractedProblem = {
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
      images: [],
    };
    problems.push(assembled);
    pendingImages.push({
      problem: assembled,
      files: figuresFor(
        markdown,
        pdfData ? (captured.get(pdfData.number) ?? []) : [],
        rawProblem.images,
      ),
    });

    processedNumbers.add(canonicalNumber);
  }

  // -------------------------------------------------------------------------
  // 5. Process PDF-only problems (PDF found them but the ZIP had no data)
  // -------------------------------------------------------------------------
  for (const pdfProblem of pdfResult.problems) {
    if (!processedNumbers.has(pdfProblem.number)) {
      const assembled: ExtractedProblem = {
        number: pdfProblem.number,
        name: pdfProblem.name,
        studentData: pdfProblem.studentInput,
        studentOutput: pdfProblem.studentOutput,
        testData: "",
        testOutput: "",
        solution: "",
        markdown: pdfProblem.markdown,
        images: [],
      };
      problems.push(assembled);
      pendingImages.push({
        problem: assembled,
        files: figuresFor(
          pdfProblem.markdown,
          captured.get(pdfProblem.number) ?? [],
          [],
        ),
      });
    }
  }

  // -------------------------------------------------------------------------
  // 5b. Upload every problem's figures concurrently.
  // -------------------------------------------------------------------------
  const figureCount = pendingImages.reduce((n, p) => n + p.files.length, 0);
  const figureDetail =
    figureCount === 0
      ? "No figures"
      : `${figureCount} figure${figureCount === 1 ? "" : "s"}`;
  emit({ type: "step", id: "images", status: "active", detail: figureDetail });
  await Promise.all(
    pendingImages.map(async ({ problem, files }) => {
      try {
        problem.images = await uploadImages(files);
      } catch (error) {
        console.error(
          `[extract] figure upload failed for problem ${problem.number}:`,
          error,
        );
      }
    }),
  );
  emit({ type: "step", id: "images", status: "done", detail: figureDetail });

  emit({ type: "step", id: "assemble", status: "active" });
  progress("Assembling competition…", 93);

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
