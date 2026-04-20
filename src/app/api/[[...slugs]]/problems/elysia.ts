import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { problem, competition } from "@/server/db/schemas/core-schema";
import { and, eq } from "drizzle-orm";
import {
  IdParam,
  ProblemEnabled,
  publicProblemSelect,
  shortProblemSelect,
  TProblemSchema,
  TShortProblemSchema,
  WithProblemEnabled,
} from "../utils";

export const ProblemAPI = new Elysia()
  .get(
    "/problems/",
    ({ query }) => {
      if (query.limit !== undefined) {
        return db
          .select(shortProblemSelect())
          .from(problem)
          .where(ProblemEnabled())
          .limit(query.limit)
          .offset(query.offset ?? 0);
      }

      return db
        .select(shortProblemSelect())
        .from(problem)
        .where(ProblemEnabled())
        .offset(query.offset ?? 0);
    },
    {
      query: t.Object({
        limit: t.Optional(t.Integer()),
        offset: t.Optional(t.Integer({ default: 0 })),
      }),
      response: t.Array(TShortProblemSchema),
      detail: {
        operationId: "getAllProblems",
        summary:
          "Returns minimal data for all problems, or up to a limit if specified",
        description:
          "Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.",
        tags: ["problem"],
      },
    },
  )
  .get(
    "/problems/:id",
    async ({ params: { id } }) => {
      const result = await db
        .select(publicProblemSelect())
        .from(problem)
        .where(WithProblemEnabled(eq(problem.id, id)))
        .limit(1);

      if (result.length > 0) {
        return { success: true, problem: result[0]! };
      }

      return { success: false, problem: null };
    },
    {
      params: IdParam(),
      response: t.Object({
        success: t.Boolean(),
        problem: t.Nullable(TProblemSchema),
      }),
      detail: {
        operationId: "getProblemById",
        summary: "Get all problem data by id",
        description: "Retrieves the data for a single problem.",
        tags: ["problem"],
      },
    },
  )
  .get(
    "/problems/:id/markdown",
    async ({ params: { id } }) => {
      const dbRes = await db
        .select({ url: problem.problem_text_url })
        .from(problem)
        .where(WithProblemEnabled(eq(problem.id, id)))
        .limit(1);

      if (
        dbRes.length === 0 ||
        dbRes[0]?.url === null ||
        dbRes[0]?.url === undefined
      ) {
        return { markdown: null };
      }

      const url = dbRes[0]!.url;
      const md = await (await fetch(url)).text();
      return {
        markdown: md,
      };
    },
    {
      params: IdParam(),
      response: t.Object({
        markdown: t.Nullable(t.String()),
      }),
      detail: {
        operationId: "getProblemMarkdownById",
        summary: "Get problem markdown by id",
        tags: ["problem"],
      },
    },
  );
