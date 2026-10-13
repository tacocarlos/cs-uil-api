import { anthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  APICallError,
  generateObject,
  NoObjectGeneratedError,
  streamObject,
} from "ai";
import type { DeepPartial, LanguageModel, ModelMessage } from "ai";
import type { z } from "zod";

import { env } from "@/env";

/**
 * LLM calls with an OpenRouter fallback for Anthropic credit exhaustion.
 *
 * Every LLM call in this project goes through `generateObjectWithFallback`.
 * The primary provider is Anthropic. When the call fails specifically because
 * the account is out of credits, the identical request is retried against the
 * same model routed through OpenRouter, which bills separately.
 *
 * The fallback is deliberately narrow: it only fires on a credit/quota
 * failure, not on every transient error. A malformed prompt, a schema
 * mismatch, or a network blip should surface as-is, not be silently re-billed
 * against a second provider.
 */

/** The cheap model used for the stdin rewrite. */
export const CHEAP_MODEL = "claude-haiku-4-5";

/**
 * A model with a larger output budget, used for the packet extraction, whose
 * response (12 problems of markdown + I/O) routinely exceeds the cheap model's
 * 64K cap.
 */
export const LARGE_OUTPUT_MODEL = "claude-sonnet-4-6";

/**
 * The fallback model addressed through OpenRouter's `provider/model` scheme.
 * Kimi K3 is a strong, inexpensive general model with a 1M context window — a
 * good stand-in when the Anthropic account is out of credits, for both cheap
 * and large-output requests.
 */
const OPENROUTER_MODEL = "moonshotai/kimi-k3";

/**
 * Whether an error means the Anthropic account cannot pay for the request.
 *
 * The status code alone is NOT a reliable signal, for two reasons found by
 * reading `@ai-sdk/anthropic`:
 *
 *  1. Non-streaming failures keep the real HTTP status, but Anthropic returns
 *     billing problems as **400** (with a credit/billing message), not 402.
 *  2. `generateObject` uses the streaming transport, whose error handler maps
 *     EVERY error to **500** unless it is `overloaded_error` — so a credit
 *     failure surfaces as a 500 with the real reason only in the message.
 *
 * Detection therefore keys off the message/response-body content, gated by a
 * status allowlist so a genuine rate-limit or permission error (which is
 * transient and worth retrying on the same provider) is not misclassified as
 * a billing problem.
 */
export function isCreditExhaustion(error: unknown): boolean {
  if (!APICallError.isInstance(error)) return false;

  // 402 (Payment Required) is unambiguous on its own.
  if (error.statusCode === 402) return true;

  const haystack = `${error.message}\n${error.responseBody ?? ""}`.toLowerCase();

  const mentionsBilling =
    haystack.includes("credit") ||
    haystack.includes("billing") ||
    haystack.includes("insufficient") ||
    haystack.includes("payment") ||
    haystack.includes("balance") ||
    haystack.includes("quota");

  if (!mentionsBilling) return false;

  // 400 is how Anthropic actually reports billing errors. 403/429 count only
  // because the body mentions money (otherwise they are permission/rate-limit
  // issues). 500 is what the streaming transport maps a billing failure to.
  // `undefined` covers proxies that drop the status.
  const status = error.statusCode;
  return (
    status === undefined ||
    status === 400 ||
    status === 403 ||
    status === 429 ||
    status === 500
  );
}

function openRouterModel(modelId: string): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env.OPEN_ROUTER_API_KEY });
  // Kimi K3 is used for any fallback request; the requested Anthropic model id
  // only chooses between cheap and large-output budgets, so routing both to K3
  // is correct and keeps the fallback simple.
  return openrouter.chat(OPENROUTER_MODEL);
}

/**
 * Whether a `generateObject` failure was caused by the model running out of
 * output tokens. When that happens the JSON is cut off mid-stream, fails to
 * parse, and the SDK throws `NoObjectGeneratedError` with
 * `finishReason: "length"`. This is the "object error" seen on large
 * extractions: the model generates for minutes, hits the cap, and the
 * truncated response cannot be parsed.
 */
export function isOutputTruncation(error: unknown): boolean {
  return (
    NoObjectGeneratedError.isInstance(error) && error.finishReason === "length"
  );
}

/** A clearer, actionable error for output truncation. */
export class OutputTruncatedError extends Error {
  constructor(modelId: string) {
    super(
      `The model (${modelId}) ran out of output tokens before finishing, so its ` +
        "response was cut off and could not be parsed. The extraction produced " +
        "more text than the model's output limit allows. Try a model with a " +
        "larger output budget, or split the input.",
    );
    this.name = "OutputTruncatedError";
  }
}

export interface GenerateObjectOptions<T extends z.ZodTypeAny> {
  schema: T;
  system: string;
  messages: ModelMessage[];
  temperature?: number;
  /** Override the model for both providers. Defaults to the cheap model. */
  model?: string;
  /** Cap on generated tokens. */
  maxOutputTokens?: number;
}

/**
 * Runs `generateObject` against Anthropic, falling back to OpenRouter when the
 * Anthropic account is out of credits.
 *
 * Returns the parsed object plus which provider actually served the request,
 * so callers can surface "served via fallback" in logs and reports.
 */
export async function generateObjectWithFallback<T extends z.ZodTypeAny>(
  options: GenerateObjectOptions<T>,
): Promise<{
  object: z.infer<T>;
  provider: "anthropic" | "openrouter";
  finishReason: string;
}> {
  const modelId = options.model ?? CHEAP_MODEL;

  const build = (model: LanguageModel) => ({
    model,
    schema: options.schema,
    system: options.system,
    messages: options.messages,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
  });

  try {
    const { object, finishReason } = await generateObject(
      build(anthropic(modelId)),
    );
    return { object, provider: "anthropic", finishReason };
  } catch (error) {
    // Truncation is not a billing problem — surface it clearly rather than
    // falling through to a confusing raw parse error.
    if (isOutputTruncation(error)) {
      throw new OutputTruncatedError(modelId);
    }

    if (!isCreditExhaustion(error)) {
      throw error;
    }

    console.warn(
      "[ai] Anthropic request failed due to credit exhaustion; " +
        `retrying via OpenRouter (${OPENROUTER_MODEL}).`,
    );

    try {
      const { object, finishReason } = await generateObject(
        build(openRouterModel(modelId)),
      );
      return { object, provider: "openrouter", finishReason };
    } catch (fallbackError) {
      if (isOutputTruncation(fallbackError)) {
        throw new OutputTruncatedError(OPENROUTER_MODEL);
      }
      throw fallbackError;
    }
  }
}

export interface StreamObjectOptions<T extends z.ZodTypeAny>
  extends GenerateObjectOptions<T> {
  /** Called with each partial object as the model streams it. */
  onPartial?: (partial: DeepPartial<z.infer<T>>) => void;
}

/**
 * Streaming counterpart of {@link generateObjectWithFallback}: identical
 * provider fallback and truncation handling, but reports partial objects as
 * they arrive so long calls can drive live progress.
 *
 * If the Anthropic attempt fails over to OpenRouter after some partials were
 * reported, the OpenRouter stream starts again from an empty object —
 * `onPartial` consumers must tolerate progress resetting.
 */
export async function streamObjectWithFallback<T extends z.ZodTypeAny>(
  options: StreamObjectOptions<T>,
): Promise<{
  object: z.infer<T>;
  provider: "anthropic" | "openrouter";
  finishReason: string;
}> {
  const modelId = options.model ?? CHEAP_MODEL;

  const run = async (model: LanguageModel) => {
    // Request failures (including credit exhaustion) arrive as stream error
    // chunks routed to `onError`, not as a rejected `object` promise, so they
    // are captured here and rethrown once the stream has closed.
    let streamError: unknown;
    const result = streamObject({
      model,
      schema: options.schema,
      system: options.system,
      messages: options.messages,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      onError: ({ error }) => {
        streamError ??= error;
      },
    });
    // Avoid an unhandled rejection when we throw `streamError` instead.
    result.object.catch(() => {});

    for await (const partial of result.partialObjectStream) {
      options.onPartial?.(partial as DeepPartial<z.infer<T>>);
    }
    if (streamError !== undefined) throw streamError;

    const object = (await result.object) as z.infer<T>;
    const finishReason = await result.finishReason;
    return { object, finishReason };
  };

  try {
    const { object, finishReason } = await run(anthropic(modelId));
    return { object, provider: "anthropic", finishReason };
  } catch (error) {
    if (isOutputTruncation(error)) {
      throw new OutputTruncatedError(modelId);
    }

    if (!isCreditExhaustion(error)) {
      throw error;
    }

    console.warn(
      "[ai] Anthropic stream failed due to credit exhaustion; " +
        `retrying via OpenRouter (${OPENROUTER_MODEL}).`,
    );

    try {
      const { object, finishReason } = await run(openRouterModel(modelId));
      return { object, provider: "openrouter", finishReason };
    } catch (fallbackError) {
      if (isOutputTruncation(fallbackError)) {
        throw new OutputTruncatedError(OPENROUTER_MODEL);
      }
      throw fallbackError;
    }
  }
}
