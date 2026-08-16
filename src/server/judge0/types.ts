import type { VerificationStatus } from "@/server/db/schemas/core-schema";

export type { VerificationStatus };

/** Which input/expected-output pair a run was executed against. */
export type VerificationCaseKind = "test" | "student";

/** Outcome of executing the solution against a single input/output pair. */
export interface VerificationCaseResult {
  kind: VerificationCaseKind;
  status: VerificationStatus;
  /** Short human-readable explanation of this case's outcome. */
  message: string;
  /** 1-based line number of the first mismatch, when status is `failed`. */
  mismatchLine?: number;
  /** The expected line at `mismatchLine`. */
  expectedLine?: string;
  /** The actual line at `mismatchLine`. */
  actualLine?: string;
  /** Raw stdout produced by the program (truncated). */
  stdout?: string;
  /** Compiler output / stderr, when the run errored (truncated). */
  stderr?: string;
  /** Wall-clock seconds reported by Judge0. */
  time?: string;
  /** Peak memory in KB reported by Judge0. */
  memory?: number;
}

/** Aggregate verification outcome for one problem. */
export interface VerificationOutcome {
  status: VerificationStatus;
  /** Multi-line human-readable report, persisted to `verification_message`. */
  message: string;
  cases: VerificationCaseResult[];
  /** Judge0 language that was used, for display. */
  languageName?: string;
}

/** Raw Judge0 submission response (subset we consume). */
export interface Judge0Submission {
  token?: string;
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
}

/**
 * Whether a problem is expected to run without any input.
 *
 * UIL packets open with a warm-up problem that takes no input at all — it
 * prints a fixed result — while every later problem reads a `.dat` file. So an
 * empty input set is a legitimate state for problem 1, but for any other
 * problem it means extraction failed to find the data and running would only
 * produce a misleading result.
 */
export function runsWithoutInput(
  problemNumber: number | null | undefined,
): boolean {
  return problemNumber === 1;
}

/**
 * Judge0 status IDs.
 * 1 In Queue · 2 Processing · 3 Accepted · 4 Wrong Answer · 5 Time Limit
 * Exceeded · 6 Compilation Error · 7-12 Runtime Errors · 13 Internal Error
 * · 14 Exec Format Error
 */
export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;
