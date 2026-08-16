import { createSolutionRunner } from "./runner";
import type { RunnerOptions } from "./runner";
import type { Judge0RunResult } from "./client";
import { JUDGE0_STATUS, runsWithoutInput } from "./types";
import type {
  VerificationCaseKind,
  VerificationCaseResult,
  VerificationOutcome,
  VerificationStatus,
} from "./types";

/** Max characters of program/compiler output retained in a report. */
const MAX_CAPTURE = 2_000;

function truncate(value: string, limit = MAX_CAPTURE): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n… (truncated, ${value.length - limit} more characters)`;
}

/**
 * Normalises program output for comparison.
 *
 * Competition judging tolerates line-ending differences, trailing whitespace
 * on a line, and trailing blank lines at end of file — but is otherwise exact
 * (including case and interior spacing).
 */
function normalizeOutput(value: string): string[] {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .reduce<string[]>((lines, line, index, all) => {
      // Drop trailing blank lines only (interior blanks are significant).
      const isTrailingBlank =
        line === "" && all.slice(index).every((l) => l.trim() === "");
      if (!isTrailingBlank) lines.push(line);
      return lines;
    }, []);
}

export interface OutputComparison {
  match: boolean;
  /** 1-based line number of the first difference. */
  mismatchLine?: number;
  expectedLine?: string;
  actualLine?: string;
}

/** Compares actual vs expected output, reporting the first differing line. */
export function compareOutput(
  actual: string,
  expected: string,
): OutputComparison {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);

  const max = Math.max(a.length, e.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== e[i]) {
      return {
        match: false,
        mismatchLine: i + 1,
        expectedLine: e[i] ?? "(no more output expected)",
        actualLine: a[i] ?? "(program produced no more output)",
      };
    }
  }

  return { match: true };
}

export interface VerifyInput {
  solution: string;
  testData: string;
  testOutput: string;
  studentData: string;
  studentOutput: string;
  /**
   * Used to synthesise the conventional `<problemname>.dat` input file that
   * UIL solutions read from disk.
   */
  problemName?: string;
  /**
   * 1-based problem number. Problem 1 takes no input by UIL convention, so
   * missing input data is treated as legitimate rather than as a failed
   * extraction — see `runsWithoutInput`.
   */
  problemNumber?: number;
}

export type VerifyOptions = RunnerOptions;

interface CaseInput {
  kind: VerificationCaseKind;
  stdin: string;
  expected: string;
}

/** Maps a terminal Judge0 status to a case result. */
function interpretRun(
  kind: VerificationCaseKind,
  run: Judge0RunResult,
  expected: string,
): VerificationCaseResult {
  const base = {
    kind,
    time: run.time ?? undefined,
    memory: run.memory ?? undefined,
  };

  if (run.statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
    return {
      ...base,
      status: "error",
      message: "Compilation failed.",
      stderr: truncate(run.compileOutput || run.message || "No compiler output."),
    };
  }

  if (run.statusId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED) {
    return {
      ...base,
      status: "error",
      message: "Time limit exceeded.",
      stdout: truncate(run.stdout),
    };
  }

  if (
    run.statusId === JUDGE0_STATUS.INTERNAL_ERROR ||
    run.statusId === JUDGE0_STATUS.EXEC_FORMAT_ERROR
  ) {
    return {
      ...base,
      status: "error",
      message: `Judge0 internal error: ${run.statusDescription}`,
      stderr: truncate(run.message || run.stderr),
    };
  }

  // Status 7–12 are the runtime-error family (SIGSEGV, NZEC, etc.).
  if (run.statusId > JUDGE0_STATUS.COMPILATION_ERROR) {
    return {
      ...base,
      status: "error",
      message: `Runtime error: ${run.statusDescription}`,
      stdout: truncate(run.stdout),
      stderr: truncate(run.stderr || run.message),
    };
  }

  // Ran to completion — compare output ourselves rather than relying on
  // Judge0's expected_output, so we control the normalisation rules.
  const comparison = compareOutput(run.stdout, expected);
  if (comparison.match) {
    return { ...base, status: "passed", message: "Output matched." };
  }

  return {
    ...base,
    status: "failed",
    message: `Output differs at line ${comparison.mismatchLine}.`,
    mismatchLine: comparison.mismatchLine,
    expectedLine: comparison.expectedLine,
    actualLine: comparison.actualLine,
    stdout: truncate(run.stdout),
  };
}

/** Builds the persisted, human-readable report. */
function buildReport(
  cases: VerificationCaseResult[],
  notes: string[],
  languageName: string,
): string {
  const lines: string[] = [`Language: ${languageName}`];

  if (notes.length > 0) {
    lines.push("", "Source adjustments:");
    for (const n of notes) lines.push(`  • ${n}`);
  }

  for (const c of cases) {
    const label = c.kind === "test" ? "Judge test data" : "Student sample data";
    lines.push("", `[${c.status.toUpperCase()}] ${label} — ${c.message}`);

    if (c.mismatchLine !== undefined) {
      lines.push(`  expected: ${JSON.stringify(c.expectedLine)}`);
      lines.push(`  actual:   ${JSON.stringify(c.actualLine)}`);
    }
    if (c.stderr) {
      lines.push("  output:", ...c.stderr.split("\n").map((l) => `    ${l}`));
    }
  }

  return lines.join("\n");
}

/** Picks the most severe status across all executed cases. */
function aggregate(cases: VerificationCaseResult[]): VerificationStatus {
  if (cases.length === 0) return "skipped";
  if (cases.some((c) => c.status === "error")) return "error";
  if (cases.some((c) => c.status === "failed")) return "failed";
  return "passed";
}

/**
 * Executes a problem's reference solution against its judge data (and, when
 * present, its student sample data) and reports whether the produced output
 * matches the expected output.
 *
 * Never throws: infrastructure failures are reported as an `error` outcome so
 * a single unreachable Judge0 run cannot abort a batch.
 */
export async function verifySolution(
  input: VerifyInput,
  options: VerifyOptions = {},
): Promise<VerificationOutcome> {
  if (input.solution.trim().length === 0) {
    return {
      status: "skipped",
      message: "No reference solution to execute.",
      cases: [],
    };
  }

  // An expected output is always required — there is nothing to compare
  // against without one. Input may legitimately be empty for problem 1.
  const noInput = runsWithoutInput(input.problemNumber);
  const runnable = (data: string, expected: string) =>
    expected.trim().length > 0 && (noInput || data.trim().length > 0);

  const candidates: CaseInput[] = [];
  if (runnable(input.testData, input.testOutput)) {
    candidates.push({
      kind: "test",
      stdin: input.testData,
      expected: input.testOutput,
    });
  }
  if (runnable(input.studentData, input.studentOutput)) {
    candidates.push({
      kind: "student",
      stdin: input.studentData,
      expected: input.studentOutput,
    });
  }

  if (candidates.length === 0) {
    return {
      status: "skipped",
      message: noInput
        ? "No expected output to check against. Problem 1 takes no input, so only an expected output is needed."
        : "No input/expected-output pair available to check against (need both test data and test output, or both student data and student output).",
      cases: [],
    };
  }

  const runner = createSolutionRunner(
    input.solution,
    input.problemName,
    options,
  );

  const cases: VerificationCaseResult[] = [];
  for (const candidate of candidates) {
    const outcome = await runner.run(candidate.stdin);

    cases.push(
      outcome.ok
        ? interpretRun(candidate.kind, outcome.run, candidate.expected)
        : { kind: candidate.kind, status: "error", message: outcome.error },
    );
  }

  return {
    status: aggregate(cases),
    message: buildReport(cases, runner.notes, runner.language.name),
    cases,
    languageName: runner.language.name,
  };
}

/**
 * Runs `verifySolution` across many problems with bounded concurrency so a
 * bulk re-check doesn't overwhelm the Judge0 instance.
 */
export async function verifyAll<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 3,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        const item = items[index];
        if (item !== undefined) await worker(item);
      }
    },
  );
  await Promise.all(runners);
}
