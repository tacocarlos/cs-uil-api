import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";
import { eq, and } from "drizzle-orm";

import {
  getPublicCompetitionData,
  IdParam,
  OptionalInt,
  publicProblemSelect,
  TCompetitionSchema,
  TProblemSchema,
} from "../utils";

// `normalize: "typebox"` avoids Elysia's "exact mirror" response-cleaning
// codegen, which gets mangled by Next.js/Vercel minification and can rewrite
// valid rows to `null` (response-validation 422 in production).
export const CompetitionAPI = new Elysia({ normalize: "typebox" })
  .get(
    "/competition/",
    async ({ query }) => {
      const q = db
        .select()
        .from(competition)
        .where(eq(competition.enabled, true))
        .offset(query.offset ?? 0);

      if (query.limit !== undefined) {
        return (await q.limit(query.limit)).map(getPublicCompetitionData);
      }

      return (await q).map(getPublicCompetitionData);
    },
    {
      query: t.Object({
        limit: OptionalInt(),
        offset: OptionalInt(0),
      }),
      response: t.Array(TCompetitionSchema),
      detail: {
        operationId: "getAllCompetitions",
        summary: "Returns a list of all competitions",
        tags: ["competition"],
      },
    },
  )
  .get(
    "/competition/:id/problems",
    async ({ params: { id } }) => {
      const problems = await db
        .select(publicProblemSelect())
        .from(problem)
        .where(and(eq(problem.enabled, true), eq(problem.competition, id)));
      return problems;
    },
    {
      params: IdParam(),
      response: t.Array(TProblemSchema),
      detail: {
        operationId: "getCompetitionProblems",
        summary: "Returns all problems for a given competition",
        tags: ["competition"],
      },
    },
  );
