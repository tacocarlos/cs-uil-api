import { env } from "@/env";
import type { Judge0Submission } from "./types";
import { JUDGE0_STATUS } from "./types";

/**
 * Minimal Judge0 CE client.
 *
 * Submissions are created asynchronously and then polled. `?wait=true` is
 * intentionally not used: it is disabled by default on self-hosted Judge0
 * installations, and relying on it makes the client fail in a way that is
 * hard to diagnose. Polling works on every configuration.
 *
 * All payloads use `base64_encoded=true` so that source code, stdin and
 * expected output survive transit byte-for-byte. Competition data regularly
 * contains characters that would otherwise be mangled.
 */

export interface RunOptions {
  sourceCode: string;
  languageId: number;
  stdin: string;
  /**
   * Base64-encoded zip extracted into the submission's working directory
   * alongside the source. Used to supply the `<problemname>.dat` input file
   * that UIL solutions read from disk.
   */
  additionalFilesBase64?: string | null;
  /** Seconds of CPU time allowed per run. */
  cpuTimeLimit?: number;
  /** Overall wall-clock budget for create + poll, in milliseconds. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class Judge0Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Judge0Error";
  }
}

const DEFAULT_CPU_TIME_LIMIT = 5;
const DEFAULT_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 600;

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function decode(value: string | null | undefined): string {
  if (!value) return "";
  return Buffer.from(value, "base64").toString("utf8");
}

function baseUrl(): string {
  return env.JUDGE0_URL.replace(/\/+$/, "");
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.JUDGE0_TOKEN) h["X-Auth-Token"] = env.JUDGE0_TOKEN;
  return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Decoded view of a completed Judge0 run.
 * `statusId` is the raw Judge0 status so callers can distinguish compile
 * errors from runtime errors from timeouts.
 */
export interface Judge0RunResult {
  statusId: number;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  time: string | null;
  memory: number | null;
}

/**
 * Executes source against stdin and resolves once Judge0 reaches a terminal
 * status. Throws {@link Judge0Error} when the instance is unreachable,
 * rejects the submission, or does not finish within the time budget.
 */
export async function runSubmission(
  options: RunOptions,
): Promise<Judge0RunResult> {
  const {
    sourceCode,
    languageId,
    stdin,
    additionalFilesBase64,
    cpuTimeLimit = DEFAULT_CPU_TIME_LIMIT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  const deadline = Date.now() + timeoutMs;
  const url = `${baseUrl()}/submissions?base64_encoded=true&wait=false`;

  let createRes: Response;
  try {
    createRes = await fetch(url, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      signal,
      body: JSON.stringify({
        language_id: languageId,
        source_code: encode(sourceCode),
        stdin: encode(stdin),
        cpu_time_limit: cpuTimeLimit,
        // Already base64 — `additional_files` is defined as the raw bytes of a
        // zip, which we encode when the archive is built.
        ...(additionalFilesBase64
          ? { additional_files: additionalFilesBase64 }
          : {}),
      }),
    });
  } catch (e) {
    throw new Judge0Error(
      `Could not reach Judge0 at ${baseUrl()}: ${
        e instanceof Error ? e.message : "unknown network error"
      }`,
    );
  }

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Judge0Error(
      `Judge0 rejected the submission (HTTP ${createRes.status}). ${body.slice(0, 300)}`,
    );
  }

  const created = (await createRes.json()) as Judge0Submission;
  const token = created.token;
  if (!token) {
    throw new Judge0Error("Judge0 did not return a submission token.");
  }

  // ── Poll until terminal ──────────────────────────────────────────────────
  const pollUrl = `${baseUrl()}/submissions/${token}?base64_encoded=true`;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let res: Response;
    try {
      res = await fetch(pollUrl, {
        headers: headers(),
        cache: "no-store",
        signal,
      });
    } catch (e) {
      throw new Judge0Error(
        `Lost connection to Judge0 while polling: ${
          e instanceof Error ? e.message : "unknown network error"
        }`,
      );
    }

    if (!res.ok) {
      throw new Judge0Error(
        `Judge0 returned HTTP ${res.status} while polling submission ${token}.`,
      );
    }

    const body = (await res.json()) as Judge0Submission;
    const statusId = body.status?.id ?? JUDGE0_STATUS.IN_QUEUE;

    if (
      statusId === JUDGE0_STATUS.IN_QUEUE ||
      statusId === JUDGE0_STATUS.PROCESSING
    ) {
      continue;
    }

    return {
      statusId,
      statusDescription: body.status?.description ?? "Unknown",
      stdout: decode(body.stdout),
      stderr: decode(body.stderr),
      compileOutput: decode(body.compile_output),
      message: decode(body.message),
      time: body.time ?? null,
      memory: body.memory ?? null,
    };
  }

  throw new Judge0Error(
    `Judge0 did not finish submission ${token} within ${Math.round(
      timeoutMs / 1000,
    )}s.`,
  );
}
