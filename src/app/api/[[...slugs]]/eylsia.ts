import { Elysia, t } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { ProblemAPI } from "./problems/elysia";
import { CompetitionAPI } from "./competitions/elysia";

/** Published as the OpenAPI `info.version`, which generated SDKs embed. */
export const API_VERSION = "0.0.1";

// A handler function rather than a static value: static responses are
// pre-built `Response` objects, which fail the `t.String()` response check.
const Version = new Elysia().get(
  "/version",
  () => `v${API_VERSION}`,
  {
    response: t.String(),
    detail: {
      operationId: "getVersion",
      summary: "Returns the API version",
      tags: ["meta"],
    },
  },
);

export const UILApi = new Elysia({ prefix: "/api", normalize: "typebox" })
  .use(cors())
  .use(
    openapi({
      documentation: {
        info: {
          title: "UIL CS API",
          description:
            "Public API for UIL Computer Science competitions and problems.",
          version: API_VERSION,
        },
      },
    }),
  )
  .use(ProblemAPI)
  .use(CompetitionAPI)
  .use(Version);
