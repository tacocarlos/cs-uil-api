import { z } from "zod";
import {
  CHEAP_MODEL,
  LARGE_OUTPUT_MODEL,
  OPENROUTER_VISION_MODEL,
  OutputTruncatedError,
  streamObjectWithFallback,
} from "@/server/ai/fallback";
import { normalizePlaceholders } from "@/lib/problem-images";
import type { PdfProblemExtraction } from "./types";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/** Full extraction shape for a single problem. */
const problemSchema = z.object({
  number: z.number().int().describe("1-based problem number"),
  name: z
    .string()
    .min(1)
    .describe("Problem title only — no 'Problem N:' prefix"),
  markdown: z
    .string()
    .describe(
      "Complete problem content as GitHub-flavoured markdown. " +
        "Rules: " +
        "1) Use '# Problem N: Name' as the top-level heading. " +
        "2) Use '## Section' for: Description, Input Format, Output Format, Example, Notes. " +
        "3) Wrap sample input/output in fenced code blocks with no language tag. " +
        "4) Preserve all numeric constraints, data types, and limits verbatim. " +
        "5) Format tables using GFM pipe syntax. " +
        "6) For each figure or diagram seen in this problem (not tables or ASCII art, " +
        "   which are text), insert a placeholder: " +
        "   ![Figure N](uil-cs-api-figure:N)  — where N is 1-based within THIS problem, " +
        "   and record its location in `figures`. " +
        "7) For inline math use $expression$; display math use $$expression$$.",
    ),
  student_input: z
    .string()
    .describe(
      "The exact sample input text shown in the 'Sample Input' section of this problem. " +
        "Copy verbatim, preserving all whitespace and line breaks as real newline characters. " +
        "Return an empty string if the problem has no sample input, including when the " +
        "packet just says 'None'.",
    ),
  student_output: z
    .string()
    .describe(
      "The exact expected output shown in the 'Sample Output' or 'Expected Output' section. " +
        "Copy verbatim, preserving all whitespace and line breaks as real newline characters.",
    ),
  figures: z
    .array(
      z.object({
        figure: z
          .number()
          .int()
          .describe("N of the matching ![Figure N](uil-cs-api-figure:N) placeholder"),
        page: z
          .number()
          .int()
          .describe(
            "1-based index of the PDF page the figure is on, counting from the " +
              "first page of the file (not the printed page number)",
          ),
        box: z
          .object({
            x0: z.number().describe("Left edge, 0–1000"),
            y0: z.number().describe("Top edge, 0–1000"),
            x1: z.number().describe("Right edge, 0–1000"),
            y1: z.number().describe("Bottom edge, 0–1000"),
          })
          .describe(
            "Bounding box of the whole figure on a 0–1000 grid over the page " +
              "(0,0 = top-left, 1000,1000 = bottom-right), including its labels " +
              "but not surrounding body text",
          ),
      }),
    )
    .describe(
      "One entry per uil-cs-api-figure:N placeholder in the markdown, giving where that " +
        "figure appears in the PDF. Empty if the problem has no figures.",
    ),
});

/**
 * Pass 1 — a lightweight scan that returns only the problem list and packet
 * metadata. The output is tiny, so it can never hit the output-token cap.
 */
const pdfScanSchema = z.object({
  problems: z
    .array(
      z.object({
        number: z.number().int().describe("1-based problem number"),
        name: z.string().min(1).describe("Problem title only"),
      }),
    )
    .describe("Every problem in the packet, in document order"),
  competitionYear: z
    .number()
    .int()
    .nullable()
    .describe("4-digit year visible on the packet cover/header, or null"),
  competitionLevel: z
    .string()
    .nullable()
    .describe(
      "Competition level visible on the packet (e.g. 'district', 'state', 'invA'), or null",
    ),
});

/** Pass 2 — full extraction for a subset of problems. */
const pdfChunkSchema = z.object({
  problems: z
    .array(problemSchema)
    .describe("The requested problems, fully extracted"),
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `\
You are a precise document extraction engine for UIL (University Interscholastic League) \
Computer Science competition student packets.

Your job is to extract every problem from the PDF and return structured JSON.

Guidelines:
- UIL CS packets contain numbered problems (typically 1–12).
- Each problem has: a title, a text description, input/output format specifications, \
  sample I/O, and optional notes or figures.
- Reproduce all technical information exactly — constraints, data types, edge cases, \
  example values.
- For figures or diagrams (graphs, trees, grids, flow charts, etc.), insert a placeholder \
  in the markdown at the correct position: ![Figure N](uil-cs-api-figure:N) where N resets to 1 for \
  each problem. For each placeholder, add an entry to figures giving the PDF page it is on \
  and its bounding box on a 0–1000 grid over that page. The box is used to screenshot the \
  figure, so it must enclose the entire figure and nothing else.
- A table of plain text is not a figure: write it as a GFM table instead.
- Neither is ASCII art or any other picture drawn with text characters (e.g. a \
  shape in the sample output): copy it character for character into a fenced code \
  block. Only pictures you cannot reproduce as text are figures. Pictures laid out \
  together as one group (e.g. several diagrams side by side, each with a caption) \
  are a single figure; its box covers the whole group, captions included.
- Do NOT summarise or paraphrase. Reproduce the full problem content.
- Competition metadata (year, level) is usually on the cover page or page headers.
- For student_input: copy the exact text from the 'Sample Input' section verbatim \
  (all test cases, all whitespace, all line breaks). Return "" if no sample input is shown \
  or the section just says "None".
- For student_output: copy the exact text from the 'Sample Output' section verbatim. \
  Return "" if no sample output is shown.`.trim();

/**
 * A sample input section that only says there is no input. Models copy the
 * packet's "None" verbatim despite the instructions, and it would otherwise be
 * stored as a one-line input file.
 */
const NO_INPUT = /^\s*(?:none|n\/a)\.?\s*$/i;

/** Whether an error (or its cause) is a fetch timeout. */
function isTimeout(error: unknown): boolean {
  for (let e = error; e instanceof Object; e = (e as { cause?: unknown }).cause) {
    if ((e as { name?: unknown }).name === "TimeoutError") return true;
  }
  return false;
}

const SCAN_SYSTEM_PROMPT = `\
You are a precise document analysis engine for UIL (University Interscholastic League) \
Computer Science competition student packets.

Your only job is to LIST the problems in the packet and read the competition metadata. \
Do NOT extract problem content.

Return:
- Every problem's number and title, in document order.
- The competition year and level from the cover page or page headers, if visible.`.trim();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** How many problems to fully extract per LLM call. */
const CHUNK_SIZE = 3;

/**
 * How many chunk requests run at once. Bounded rather than all-at-once so a
 * large packet does not trip the provider's rate limit; each in-flight request
 * is already re-sending the full PDF.
 */
const CHUNK_CONCURRENCY = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Runs `worker` over `items` with at most `concurrency` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index] as T, index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

/**
 * Fetch a PDF from `pdfUrl` and extract every UIL CS competition problem as
 * structured markdown.
 *
 * Extraction is chunked to stay within the model's output-token budget. A
 * single whole-packet call must emit 12 problems of complete markdown in one
 * response, which exceeds the output cap and truncates (surfacing as a parse
 * error after several minutes). Instead:
 *
 *   1. A scan pass reads the whole PDF but returns only the problem list and
 *      metadata — a tiny output that cannot truncate.
 *   2. A series of chunk passes each re-send the whole PDF but ask for only a
 *      few problems' full content, so every response stays small.
 *
 * The bottleneck is output tokens, not input, so re-sending the full PDF each
 * time is correct and avoids any PDF-splitting dependency.
 *
 * Both passes stream, so `hooks` can report live progress: how many problems
 * the scan has found so far, then which problem each chunk is writing and
 * when each one is complete.
 */
export interface PdfExtractionHooks {
  /** The scan pass has listed `count` problems so far. */
  onScanProgress?: (count: number) => void;
  /** The scan pass finished; these are the problems that will be extracted. */
  onScanned?: (problems: Array<{ number: number; name: string }>) => void;
  /** A chunk has started writing this problem's content. */
  onProblemWriting?: (number: number) => void;
  /** This problem's content is complete. */
  onProblemDone?: (number: number) => void;
}

export async function extractPdfProblems(
  pdfUrl: string,
  hooks: PdfExtractionHooks = {},
): Promise<{
  problems: PdfProblemExtraction[];
  yearHint: number | null;
  levelHint: string | null;
  /** The packet's bytes, for rendering figures without downloading it again */
  pdf: Buffer;
}> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF from "${pdfUrl}": ${response.status} ${response.statusText}`,
    );
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  const fileContent = {
    type: "file" as const,
    data: pdfBuffer,
    mediaType: "application/pdf",
  };

  // ── Pass 1: scan for the problem list + metadata ──────────────────────────
  let scanCount = 0;
  const { object: scan, provider } = await streamObjectWithFallback({
    model: CHEAP_MODEL,
    schema: pdfScanSchema,
    onPartial: (partial) => {
      // The last listed entry may still be mid-stream; count only those
      // followed by another entry.
      const count = Math.max(0, (partial.problems?.length ?? 0) - 1);
      if (count > scanCount) {
        scanCount = count;
        hooks.onScanProgress?.(count);
      }
    },
    system: SCAN_SYSTEM_PROMPT,
    messages: [
      {
        role: "user" as const,
        content: [
          fileContent,
          {
            type: "text" as const,
            text: "List every problem in this UIL CS competition packet, with the competition year and level.",
          },
        ],
      },
    ],
  });

  if (provider === "openrouter") {
    console.warn("[extract] PDF extraction served via OpenRouter fallback.");
  }

  const found = scan.problems;
  hooks.onScanned?.(found.map((p) => ({ number: p.number, name: p.name })));
  if (found.length === 0) {
    return {
      problems: [],
      yearHint: scan.competitionYear,
      levelHint: scan.competitionLevel,
      pdf: pdfBuffer,
    };
  }

  // ── Pass 2: extract each chunk of problems fully, in parallel ─────────────
  const chunks = chunk(found, CHUNK_SIZE);

  /**
   * Extracts a group of problems, splitting it up when the request is too
   * big: long sample I/O can push a chunk past the output budget, and a
   * reasoning model can think past the HTTP client's 5-minute idle timeout
   * before streaming anything. Single problems are much smaller, so the
   * group is retried one problem at a time (and a lone problem once more
   * after a timeout) rather than losing the whole chunk.
   */
  const extractGroup = async (
    numbers: number[],
    attempt = 1,
  ): Promise<z.infer<typeof pdfChunkSchema>["problems"]> => {
    try {
      return await extractProblems(numbers);
    } catch (error) {
      const truncated = error instanceof OutputTruncatedError;
      const timedOut = isTimeout(error);
      if (numbers.length > 1 && (truncated || timedOut)) {
        console.warn(
          `[extract] problems ${numbers.join(", ")} ${truncated ? "overflowed the output budget" : "timed out"}; retrying one at a time.`,
        );
        const problems = [];
        for (const n of numbers) problems.push(...(await extractGroup([n])));
        return problems;
      }
      if (timedOut && attempt === 1) {
        console.warn(`[extract] problem ${numbers[0]} timed out; retrying.`);
        return extractGroup(numbers, 2);
      }
      throw error;
    }
  };

  const extractProblems = async (numbers: number[]) => {
    // A problem is complete once the model has moved on to the next one.
    // Report each transition once, however many partials arrive.
    let writingIndex = -1;
    const advanceTo = (index: number) => {
      while (writingIndex < index) {
        const finished = numbers[writingIndex];
        if (finished !== undefined) hooks.onProblemDone?.(finished);
        writingIndex += 1;
        const next = numbers[writingIndex];
        if (next !== undefined) hooks.onProblemWriting?.(next);
      }
    };
    advanceTo(0);

    const { object: chunkResult } = await streamObjectWithFallback({
      model: LARGE_OUTPUT_MODEL,
      // This call also reports where each figure is on the page.
      fallbackModel: OPENROUTER_VISION_MODEL,
      schema: pdfChunkSchema,
      onPartial: (partial) => {
        const length = partial.problems?.length ?? 0;
        if (length > 0) advanceTo(Math.min(length - 1, numbers.length - 1));
      },
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user" as const,
          content: [
            fileContent,
            {
              type: "text" as const,
              text:
                `Extract ONLY the following problem(s) from this packet, in full: ` +
                `${numbers.map((n) => `#${n}`).join(", ")}. ` +
                `Ignore all other problems.`,
            },
          ],
        },
      ],
    });

    // The final problem (and any the model skipped) completes with the call.
    advanceTo(numbers.length);

    return chunkResult.problems;
  };

  const chunkResults = await mapWithConcurrency(
    chunks,
    CHUNK_CONCURRENCY,
    (group) => extractGroup(group.map((p) => p.number)),
  );

  const problems: PdfProblemExtraction[] = [];
  for (const group of chunkResults) {
    for (const p of group) {
      problems.push({
        number: p.number,
        name: p.name,
        markdown: normalizePlaceholders(p.markdown),
        figures: p.figures,
        studentOutput: p.student_output,
        studentInput: NO_INPUT.test(p.student_input) ? "" : p.student_input,
      });
    }
  }

  problems.sort((a, b) => a.number - b.number);

  return {
    problems,
    yearHint: scan.competitionYear,
    levelHint: scan.competitionLevel,
    pdf: pdfBuffer,
  };
}
