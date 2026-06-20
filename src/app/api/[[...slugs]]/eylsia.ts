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

export const UILApi = new Elysia({ prefix: "/api", normalize: "typebox" })
  .use(cors())
  .use(openapi())
  .use(ProblemAPI)
  .use(CompetitionAPI)
  .use(Version);
