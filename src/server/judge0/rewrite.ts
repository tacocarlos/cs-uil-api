import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import type { DetectedLanguage } from "./language";

/**
 * Fallback for solutions whose input file we could not supply.
 *
 * The preferred path is `buildDataFiles` — shipping the judge data to Judge0
 * as a real file via `additional_files` so the original solution runs
 * unmodified. That fails only when the filename is computed at runtime in a
 * way we cannot predict. In that case we ask the cheapest capable model to
 * mechanically redirect the program's input from the file to stdin.
 *
 * This is deliberately a last resort: any rewrite means the code being
 * verified is no longer byte-identical to the shipped solution, so every
 * rewrite is recorded in the verification report.
 */

/** Cheapest model already used elsewhere in this project. */
const REWRITE_MODEL = "claude-haiku-4-5";

/** Guard against sending pathological inputs to the model. */
const MAX_SOURCE_CHARS = 40_000;

const rewriteSchema = z.object({
  changed: z
    .boolean()
    .describe(
      "True if the source was modified to read from stdin, false if it already read from stdin and needed no change.",
    ),
  source: z
    .string()
    .describe(
      "The complete rewritten source file. Must be valid, compilable code. Never truncate or elide with comments.",
    ),
  summary: z
    .string()
    .describe(
      "One short sentence describing exactly what was changed, e.g. 'Replaced new File(\"prob.dat\") with System.in'.",
    ),
});

const SYSTEM_PROMPT = `\
You convert competitive-programming reference solutions so they read their \
input from standard input instead of from a data file on disk.

UIL Computer Science solutions conventionally open a file named after the \
problem (e.g. "numbers.dat") and read the input from it. The grading sandbox \
supplies the exact same bytes on stdin instead.

Rules:
- Change ONLY how input is obtained. Do not alter the algorithm, the output \
  format, the arithmetic, or anything else that affects the result.
- Remove or redirect file-reading constructs so the program reads stdin.
  * Java: new File("x.dat") / FileReader / FileInputStream / Scanner(File) \
    become Scanner(System.in) or BufferedReader(new InputStreamReader(System.in)).
  * Python: open("x.dat") becomes sys.stdin.
  * C/C++: fopen("x.dat","r") becomes stdin, or drop freopen entirely.
- Keep the public class name and the overall file structure intact.
- Remove now-unused imports only if leaving them would break compilation.
- Preserve output exactly, including spacing and newlines.
- Return the COMPLETE file. Never abbreviate with "..." or comments like \
  "rest unchanged".
- If the program already reads exclusively from stdin, set changed=false and \
  return the source unmodified.`;

export interface RewriteResult {
  source: string;
  changed: boolean;
  note: string;
}

/**
 * Asks the model to redirect a solution's input from a data file to stdin.
 *
 * Never throws — on any failure the original source is returned unchanged so
 * the caller can still report the underlying run error.
 */
export async function rewriteSolutionForStdin(
  source: string,
  language: DetectedLanguage,
  context: { problemName?: string; observedError?: string } = {},
): Promise<RewriteResult> {
  if (source.length > MAX_SOURCE_CHARS) {
    return {
      source,
      changed: false,
      note: "Skipped stdin rewrite: solution source is too large.",
    };
  }

  const details = [
    `Language: ${language.name}`,
    context.problemName ? `Problem name: ${context.problemName}` : null,
    context.observedError
      ? `The program failed with:\n${context.observedError.slice(0, 1_000)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: anthropic(REWRITE_MODEL),
      schema: rewriteSchema,
      system: SYSTEM_PROMPT,
      temperature: 0,
      messages: [
        {
          role: "user" as const,
          content: `${details}\n\nRewrite this solution to read from stdin:\n\n${source}`,
        },
      ],
    });

    const rewritten = object.source.trim();
    if (!object.changed || rewritten.length === 0) {
      return {
        source,
        changed: false,
        note: "Model reported the solution already reads from stdin.",
      };
    }

    return {
      source: rewritten,
      changed: true,
      note: `Rewrote solution to read stdin via ${REWRITE_MODEL}: ${object.summary}`,
    };
  } catch (e) {
    return {
      source,
      changed: false,
      note: `Stdin rewrite unavailable: ${
        e instanceof Error ? e.message : "unknown error"
      }`,
    };
  }
}
