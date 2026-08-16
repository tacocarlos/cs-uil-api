import { detectLanguage, prepareSource } from "./language";
import type { DetectedLanguage } from "./language";
import { Judge0Error, runSubmission } from "./client";
import type { Judge0RunResult } from "./client";
import { buildDataFiles, looksLikeMissingInputFile } from "./data-files";
import { rewriteSolutionForStdin } from "./rewrite";

/**
 * Shared execution harness for a single problem's reference solution.
 *
 * Both verification (compare output) and output generation (capture output)
 * need identical execution semantics: the same Java `Main` rewriting, the same
 * `<problemname>.dat` provisioning, and the same one-time LLM stdin fallback.
 * Centralising it here guarantees the two features can never drift apart —
 * a generated output is always produced the same way it would be verified.
 *
 * The runner is stateful across calls: once a stdin rewrite has been applied
 * it is reused for subsequent runs rather than paying for it again.
 */

export interface RunnerOptions {
  cpuTimeLimit?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Allow a one-time LLM rewrite to stdin. Defaults to `true`. */
  allowStdinRewrite?: boolean;
}

export type RunnerOutcome =
  | { ok: true; run: Judge0RunResult }
  | { ok: false; error: string };

export interface SolutionRunner {
  language: DetectedLanguage;
  /** Notes accumulated so far (source rewrites, data files supplied). */
  notes: string[];
  /** Executes the solution against `stdin`, supplying it as a file too. */
  run(stdin: string): Promise<RunnerOutcome>;
}

export function createSolutionRunner(
  solution: string,
  problemName: string | undefined,
  options: RunnerOptions = {},
): SolutionRunner {
  const language = detectLanguage(solution);
  const prepared = prepareSource(solution, language);

  const notes: string[] = [...prepared.notes];
  const seen = new Set(notes);
  const addNote = (note: string) => {
    if (!seen.has(note)) {
      seen.add(note);
      notes.push(note);
    }
  };

  let activeSource = prepared.source;
  let rewriteAttempted = false;

  /**
   * Completed runs, keyed by stdin.
   *
   * Problem 1 takes no input, so its judge and student cases both execute with
   * an empty stdin — without this they would be two identical Judge0
   * submissions. Only completed runs are cached; infrastructure failures stay
   * uncached so a transient outage on the first case can still succeed on the
   * second.
   */
  const completed = new Map<string, Judge0RunResult>();

  async function execute(stdin: string): Promise<RunnerOutcome> {
    const plan = buildDataFiles({
      source: activeSource,
      content: stdin,
      problemName,
    });
    for (const note of plan.notes) addNote(note);

    try {
      const run = await runSubmission({
        sourceCode: activeSource,
        languageId: language.id,
        stdin,
        additionalFilesBase64: plan.archiveBase64,
        cpuTimeLimit: options.cpuTimeLimit,
        timeoutMs: options.timeoutMs,
        signal: options.signal,
      });
      return { ok: true, run };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Judge0Error
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unknown error while contacting Judge0.",
      };
    }
  }

  return {
    language,
    notes,
    async run(stdin: string): Promise<RunnerOutcome> {
      const cached = completed.get(stdin);
      if (cached) return { ok: true, run: cached };

      const first = await execute(stdin);

      // Supplying the data file covers almost every UIL solution. Only when
      // the filename is computed at runtime do we fall back to rewriting the
      // program to read stdin — once per runner, then reused.
      const shouldRewrite =
        !rewriteAttempted &&
        options.allowStdinRewrite !== false &&
        first.ok &&
        looksLikeMissingInputFile(
          first.run.stderr || first.run.message,
          first.run.stdout,
        );

      if (!shouldRewrite) {
        if (first.ok) completed.set(stdin, first.run);
        return first;
      }

      rewriteAttempted = true;
      const rewrite = await rewriteSolutionForStdin(activeSource, language, {
        problemName,
        observedError: first.ok
          ? first.run.stderr || first.run.message || first.run.stdout
          : undefined,
      });
      addNote(rewrite.note);

      if (!rewrite.changed) {
        if (first.ok) completed.set(stdin, first.run);
        return first;
      }

      // The rewrite invalidates anything cached against the previous source.
      completed.clear();
      activeSource = rewrite.source;

      const retried = await execute(stdin);
      if (retried.ok) completed.set(stdin, retried.run);
      return retried;
    },
  };
}
