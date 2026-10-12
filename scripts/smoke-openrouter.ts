/**
 * Smoke-tests the OpenRouter fallback path end to end.
 *
 *   bun run smoke:openrouter
 *
 * Three checks, all against the real OpenRouter API using OPEN_ROUTER_API_KEY:
 *
 *   1. Structured output — a `generateObject` call through Kimi K3 must return
 *      a schema-valid object (this is what both the PDF extractor and the
 *      stdin rewrite depend on).
 *   2. No truncation — a reasoning model can burn its whole token budget on
 *      hidden reasoning and return `finishReason: "length"` with no visible
 *      answer. We cap maxTokens low and assert the model still finishes.
 *   3. Fallback trigger — `isCreditExhaustion` must recognise a simulated
 *      Anthropic 402 so the retry actually fires in production.
 *
 * Exits non-zero if any check fails.
 */

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { z } from "zod";
import { APICallError } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";

import { env } from "../src/env";
import {
  generateObjectWithFallback,
  isCreditExhaustion,
} from "../src/server/ai/fallback";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n   ${detail}`}`,
  );
}

// ── 1 + 2. Structured output without truncation ─────────────────────────────

const schema = z.object({
  answer: z.number().describe("The numeric answer"),
  explanation: z.string().describe("One short sentence"),
});

async function checkStructuredOutput() {
  console.log("── OpenRouter structured output (moonshotai/kimi-k3) ──");

  const openrouter = createOpenRouter({ apiKey: env.OPEN_ROUTER_API_KEY });

  try {
    const { object, finishReason } = await generateObject({
      model: openrouter.chat("moonshotai/kimi-k3"),
      schema,
      system:
        "You answer arithmetic questions. Always respond with the requested JSON object and nothing else.",
      messages: [
        { role: "user", content: "What is 17 + 25? Reply with the JSON object." },
      ],
      temperature: 0,
      maxOutputTokens: 300,
    });

    check("returned a schema-valid object", typeof object.answer === "number");
    check("answer is correct", object.answer === 42, `got ${object.answer}`);
    check(
      "did not truncate (finishReason !== 'length')",
      finishReason !== "length",
      `finishReason was "${finishReason}" — the model likely spent its budget on hidden reasoning`,
    );
  } catch (e) {
    check(
      "OpenRouter request succeeded",
      false,
      e instanceof Error ? e.message : String(e),
    );
  }
}

// ── 3. Fallback trigger ──────────────────────────────────────────────────────

function checkFallbackTrigger() {
  console.log("\n── Fallback trigger ──");
  const creditError = new APICallError({
    message: "Your account has insufficient credits",
    url: "https://api.anthropic.com/v1/messages",
    requestBodyValues: {},
    statusCode: 402,
    responseBody: '{"type":"error","error":{"type":"billing_error"}}',
    isRetryable: false,
  });

  check(
    "isCreditExhaustion recognises a 402",
    isCreditExhaustion(creditError),
  );
  check(
    "isCreditExhaustion ignores a plain 500",
    !isCreditExhaustion(
      new APICallError({
        message: "internal",
        url: "https://api.anthropic.com/v1/messages",
        requestBodyValues: {},
        statusCode: 500,
        isRetryable: true,
      }),
    ),
  );
}

// ── 4. End-to-end fallback: force Anthropic to fail, expect OpenRouter ──────
//
// Points the Anthropic SDK at a local stub that always returns a 402 billing
// error, then calls the real `generateObjectWithFallback`. If detection and
// the retry are wired correctly, the request is served by OpenRouter and the
// result is tagged `provider: "openrouter"`.

async function checkEndToEndFallback() {
  console.log("\n── End-to-end fallback (Anthropic 402 → OpenRouter) ──");

  // A stub that mimics Anthropic failing with a credit error.
  const stub = createServer((_req, res) => {
    res.writeHead(402, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        type: "error",
        error: {
          type: "billing_error",
          message: "Your credit balance is too low to access the API.",
        },
      }),
    );
  });

  await new Promise<void>((resolve) => stub.listen(0, resolve));
  const port = (stub.address() as AddressInfo).port;

  const originalBaseURL = process.env.ANTHROPIC_BASE_URL;
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${port}`;

  try {
    const { object, provider } = await generateObjectWithFallback({
      schema,
      system: "You answer arithmetic questions with the requested JSON object.",
      messages: [{ role: "user", content: "What is 2 + 2?" }],
      temperature: 0,
      maxOutputTokens: 300,
    });

    check(
      "fell back to OpenRouter",
      provider === "openrouter",
      `provider was "${provider}" — the Anthropic failure did not trigger the fallback`,
    );
    check("fallback returned a valid object", typeof object.answer === "number");
  } catch (e) {
    check(
      "end-to-end fallback succeeded",
      false,
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    if (originalBaseURL === undefined) delete process.env.ANTHROPIC_BASE_URL;
    else process.env.ANTHROPIC_BASE_URL = originalBaseURL;
    stub.close();
  }
}

await checkStructuredOutput();
checkFallbackTrigger();
await checkEndToEndFallback();

console.log(
  failures === 0
    ? "\nOpenRouter fallback is working end to end."
    : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
