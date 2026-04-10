import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { PdfProblemExtraction } from "./types";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const pdfExtractionSchema = z.object({
  problems: z
    .array(
      z.object({
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
          .describe(
            "Number of figures/diagrams found in this problem (0 if none)",
          ),
      }),
    )
    .describe("All problems extracted in document order"),
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a PDF from `pdfUrl`, send it to Claude claude-opus-4-5, and extract every
 * UIL CS competition problem as structured markdown.
 *
 * @returns An array of extracted problems plus year/level hints parsed from
 *          the packet cover page.
 */
export async function extractPdfProblems(pdfUrl: string): Promise<{
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

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: pdfExtractionSchema,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "file" as const,
            data: pdfBuffer,
            mediaType: "application/pdf",
          },
          {
            type: "text" as const,
            text: "Extract all problems from this UIL CS competition packet.",
          },
        ],
      },
    ],
  });

  return {
    problems: object.problems.map((p) => ({
      number: p.number,
      name: p.name,
      markdown: p.markdown,
      figureCount: p.figureCount,
      studentOutput: p.student_output,
      studentInput: p.student_input,
    })),
    yearHint: object.competitionYear,
    levelHint: object.competitionLevel,
  };
}
