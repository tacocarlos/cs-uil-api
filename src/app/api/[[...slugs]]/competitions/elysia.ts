import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { competition, problem } from "@/server/db/schemas/core-schema";
import { eq, and } from "drizzle-orm";

import {
  getPublicCompetitionData,
  IdParam,
  publicProblemSelect,
} from "../utils";

export const CompetitionAPI = new Elysia()
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
        limit: t.Optional(t.Integer()),
        offset: t.Optional(t.Integer()),
      }),
      detail: {
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
      tags: ["competition"],
    },
  );
