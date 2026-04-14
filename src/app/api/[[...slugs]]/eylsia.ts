import { Elysia, t } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { ProblemAPI } from "./problems/elysia";

export const UILApi = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(openapi())
  .use(ProblemAPI);
