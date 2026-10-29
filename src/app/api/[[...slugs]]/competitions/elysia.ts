import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";
import { eq, and } from "drizzle-orm";

import {
  ApiModels,
  getPublicCompetitionData,
  IdParam,
  notFound,
  OptionalInt,
  publicProblemSelect,
} from "../utils";

// `normalize: "typebox"` avoids Elysia's "exact mirror" response-cleaning
// codegen, which gets mangled by Next.js/Vercel minification and can rewrite
// valid rows to `null` (response-validation 422 in production).
export const CompetitionAPI = new Elysia({ normalize: "typebox" })
  .use(ApiModels)
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
      response: t.Array(t.Ref("Competition")),
      detail: {
        operationId: "getAllCompetitions",
        summary: "Returns a list of all competitions",
        tags: ["competition"],
      },
    },
  )
  .get(
    "/competition/:id",
    async ({ params: { id } }) => {
      const [comp] = await db
        .select()
        .from(competition)
        .where(and(eq(competition.enabled, true), eq(competition.id, id)));
      if (comp === undefined) {
        return notFound(`Competition ${id} not found`);
      }

      return getPublicCompetitionData(comp);
    },
    {
      params: IdParam(),
      response: { 200: "Competition", 404: "ApiError" },
      detail: {
        operationId: "getCompetitionById",
        summary: "Get competition data",
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
      response: t.Array(t.Ref("Problem")),
      detail: {
        operationId: "getCompetitionProblems",
        summary: "Returns all problems for a given competition",
        tags: ["competition"],
      },
    },
  );
