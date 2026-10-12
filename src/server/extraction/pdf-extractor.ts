import { z } from "zod";
import {
  CHEAP_MODEL,
  LARGE_OUTPUT_MODEL,
  generateObjectWithFallback,
} from "@/server/ai/fallback";
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
        "6) For each figure or diagram seen in this problem, insert a placeholder: " +
        "   ![Figure N](FIGURE_N)  — where N is 1-based within THIS problem. " +
        "7) For inline math use $expression$; display math use $$expression$$.",
    ),
  student_input: z
    .string()
    .describe(
      "The exact sample input text shown in the 'Sample Input' section of this problem. " +
        "Copy verbatim, preserving all whitespace and line breaks as real newline characters. " +
        "Return an empty string if the problem has no sample input.",
    ),
  student_output: z
    .string()
    .describe(
      "The exact expected output shown in the 'Sample Output' or 'Expected Output' section. " +
        "Copy verbatim, preserving all whitespace and line breaks as real newline characters.",
    ),
  figureCount: z
    .number()
    .int()
    .describe("Number of figures/diagrams found in this problem (0 if none)"),
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
  in the markdown at the correct position: ![Figure N](FIGURE_N) where N resets to 1 for \
  each problem. Set figureCount accordingly.
- Do NOT summarise or paraphrase. Reproduce the full problem content.
- Competition metadata (year, level) is usually on the cover page or page headers.
- For student_input: copy the exact text from the 'Sample Input' section verbatim \
  (all test cases, all whitespace, all line breaks). Return "" if no sample input is shown.
- For student_output: copy the exact text from the 'Sample Output' section verbatim. \
  Return "" if no sample output is shown.`.trim();

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
 * `onProgress(message, done, total)` reports chunk completion for the loading
 * UI.
 */
export async function extractPdfProblems(
  pdfUrl: string,
  onProgress: (message: string, done: number, total: number) => void = () => {},
): Promise<{
  problems: PdfProblemExtraction[];
  yearHint: number | null;
  levelHint: string | null;
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
  onProgress("Scanning packet for problems…", 0, 1);

  const { object: scan, provider } = await generateObjectWithFallback({
    model: CHEAP_MODEL,
    schema: pdfScanSchema,
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
  if (found.length === 0) {
    return {
      problems: [],
      yearHint: scan.competitionYear,
      levelHint: scan.competitionLevel,
    };
  }

  // ── Pass 2: extract each chunk of problems fully, in parallel ─────────────
  const chunks = chunk(found, CHUNK_SIZE);
  const total = chunks.length;
  let completed = 0;

  onProgress(`Extracting ${total} chunk${total === 1 ? "" : "s"}…`, 0, total);

  const chunkResults = await mapWithConcurrency(
    chunks,
    CHUNK_CONCURRENCY,
    async (group) => {
      const numbers = group.map((p) => p.number);
      const label =
        numbers.length === 1
          ? `problem ${numbers[0]}`
          : `problems ${numbers[0]}–${numbers[numbers.length - 1]}`;

      const { object: chunkResult } = await generateObjectWithFallback({
        model: LARGE_OUTPUT_MODEL,
        schema: pdfChunkSchema,
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

      completed += 1;
      onProgress(`Extracted ${label} (${completed}/${total})`, completed, total);

      return chunkResult.problems;
    },
  );

  const problems: PdfProblemExtraction[] = [];
  for (const group of chunkResults) {
    for (const p of group) {
      problems.push({
        number: p.number,
        name: p.name,
        markdown: p.markdown,
        figureCount: p.figureCount,
        studentOutput: p.student_output,
        studentInput: p.student_input,
      });
    }
  }

  problems.sort((a, b) => a.number - b.number);

  return {
    problems,
    yearHint: scan.competitionYear,
    levelHint: scan.competitionLevel,
  };
}
