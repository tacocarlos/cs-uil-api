import { Elysia, t } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { ProblemAPI } from "./problems/elysia";
import { CompetitionAPI } from "./competitions/elysia";

const Version = new Elysia({ nativeStaticResponse: true }).get(
  "/version",
  "v0.0.1",
  {
    response: t.String(),
  },
);

export const UILApi = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(openapi())
  // OpenAPI doc UIs (and some HTTP clients) send omitted optional query
  // params as empty strings (e.g. `?limit=&offset=`). An empty string can't
  // be coerced to an integer, and `t.Optional` only allows the property to be
  // absent, so the request fails validation with a 422. Drop empty-string
  // query params before validation so they're treated as truly absent.
  .onTransform({ as: "global" }, ({ query }) => {
    for (const key in query) {
      if (query[key] === "") delete query[key];
    }
  })
  .use(ProblemAPI)
  .use(CompetitionAPI)
  .use(Version);
