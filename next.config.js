/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // mupdf (PDF figure capture) is ESM with top-level await and reads its WASM
  // binary from disk next to itself, so it must not be bundled.
  serverExternalPackages: ["mupdf"],
  // File tracing can miss that binary, since it is located at runtime.
  outputFileTracingIncludes: {
    "/api/extract": ["./node_modules/mupdf/dist/mupdf-wasm.wasm"],
  },
  experimental: {
    // serverActions: {
    //   bodySizeLimit: "256mb",
    // },
  },
};

export default config;
