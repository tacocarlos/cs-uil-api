import { createSolutionRunner } from "./runner";
import type { RunnerOptions } from "./runner";
import { JUDGE0_STATUS, runsWithoutInput } from "./types";

/**
 * Produces expected-output files by executing the reference solution.
 *
 * The counterpart to verification. Verification assumes the extracted expected
 * output is correct and tests the solution against it; generation assumes the
 * *solution* is correct and derives the expected output from it. That is the
 * right tool when the expected output was OCR'd out of a PDF (and is therefore
 * the untrustworthy half), while the solution came verbatim from the ZIP.
 *
 * Nothing here writes to the database — callers preview the produced output
 * and decide what, if anything, to overwrite.
 */

/** Max characters of captured output retained per case. */
const MAX_OUTPUT = 500_000;

export type GeneratedOutputKind = "student" | "test";
export type GeneratedOutputStatus = "ok" | "error" | "skipped";

export interface GeneratedOutput {
  kind: GeneratedOutputKind;
  status: GeneratedOutputStatus;
  /** Program stdout, present only when `status === "ok"`. */
  output?: string;
  /** Human-readable explanation of the outcome. */
  message: string;
  /** The currently-stored expected output, for side-by-side comparison. */
  existing: string;
  /** True when `output` differs from `existing` after normalisation. */
  differs?: boolean;
  stderr?: string;
  time?: string;
  memory?: number;
}

export interface GenerateOutputsResult {
  outputs: GeneratedOutput[];
  /** Source rewrites / data files supplied, surfaced to the admin. */
  notes: string[];
  languageName: string;
}

export interface GenerateOutputsInput {
  solution: string;
  studentData: string;
  testData: string;
  /** Current values, echoed back so the UI can show a before/after diff. */
  studentOutput?: string;
  testOutput?: string;
  problemName?: string;
  /**
   * 1-based problem number. Problem 1 takes no input by UIL convention, so its
   * output can still be generated with empty input — see `runsWithoutInput`.
   */
  problemNumber?: number;
}

export interface GenerateOutputsOptions extends RunnerOptions {
  /** Which outputs to produce. Defaults to both. */
  kinds?: GeneratedOutputKind[];
}

/** Loose equality used only to flag "this would change something". */
function normalizeForCompare(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/**
 * Runs the solution against the student and/or judge input and captures what
 * it prints. Never throws — every failure is reported per case.
 */
export async function generateOutputs(
  input: GenerateOutputsInput,
  options: GenerateOutputsOptions = {},
): Promise<GenerateOutputsResult> {
  const kinds = options.kinds ?? ["test", "student"];

  const plan: Array<{
    kind: GeneratedOutputKind;
    stdin: string;
    existing: string;
  }> = [];

  if (kinds.includes("test")) {
    plan.push({
      kind: "test",
      stdin: input.testData,
      existing: input.testOutput ?? "",
    });
  }
  if (kinds.includes("student")) {
    plan.push({
      kind: "student",
      stdin: input.studentData,
      existing: input.studentOutput ?? "",
    });
  }

  if (input.solution.trim().length === 0) {
    return {
      outputs: plan.map((p) => ({
        kind: p.kind,
        status: "skipped",
        message: "No reference solution to execute.",
        existing: p.existing,
      })),
      notes: [],
      languageName: "unknown",
    };
  }

  const runner = createSolutionRunner(
    input.solution,
    input.problemName,
    options,
  );

  // Problem 1 takes no input, so an empty stdin is a valid run rather than a
  // missing-data skip. Generation needs no expected output at all: it is the
  // thing being produced.
  const noInput = runsWithoutInput(input.problemNumber);

  const outputs: GeneratedOutput[] = [];

  for (const entry of plan) {
    if (entry.stdin.trim().length === 0 && !noInput) {
      outputs.push({
        kind: entry.kind,
        status: "skipped",
        message: `No ${entry.kind} input data to run against.`,
        existing: entry.existing,
      });
      continue;
    }

    const outcome = await runner.run(entry.stdin);

    if (!outcome.ok) {
      outputs.push({
        kind: entry.kind,
        status: "error",
        message: outcome.error,
        existing: entry.existing,
      });
      continue;
    }

    const { run } = outcome;

    if (run.statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
      outputs.push({
        kind: entry.kind,
        status: "error",
        message: "Compilation failed.",
        existing: entry.existing,
        stderr: run.compileOutput || run.message,
      });
      continue;
    }

    // Anything past "Wrong Answer" is a real execution failure. Capturing
    // output from a crashed or timed-out run would produce a truncated
    // expected-output file, which is worse than none at all.
    if (run.statusId > JUDGE0_STATUS.WRONG_ANSWER) {
      outputs.push({
        kind: entry.kind,
        status: "error",
        message: `Execution failed: ${run.statusDescription}`,
        existing: entry.existing,
        stderr: run.stderr || run.message,
      });
      continue;
    }

    const produced = run.stdout.slice(0, MAX_OUTPUT);
    outputs.push({
      kind: entry.kind,
      status: "ok",
      output: produced,
      existing: entry.existing,
      differs:
        normalizeForCompare(produced) !== normalizeForCompare(entry.existing),
      message:
        produced.trim().length === 0
          ? "Ran successfully but produced no output."
          : `Produced ${produced.split("\n").length} line(s) of output.`,
      time: run.time ?? undefined,
      memory: run.memory ?? undefined,
    });
  }

  return {
    outputs,
    notes: runner.notes,
    languageName: runner.language.name,
  };
}
