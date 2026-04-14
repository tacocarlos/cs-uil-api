import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { problem, competition } from "@/server/db/schemas/core-schema";
import { eq } from "drizzle-orm";

function getVisibleProblem(p: typeof problem.$inferSelect) {
  const { enabled, ...visibleData } = p;
  return visibleData;
}

export const ProblemAPI = new Elysia()
  .get(
    "/problems/",
    ({ query }) => {
      if (query.limit !== undefined) {
        const result = db
          .select({
            id: problem.id,
            competition_id: problem.competition,
            name: problem.name,
            number: problem.name,
          })
          .from(problem)
          .where(eq(problem.enabled, true))
          .limit(query.limit)
          .offset(query.offset ?? 0);
      }

      return db
        .select({
          id: problem.id,
          competition_id: problem.competition,
          name: problem.name,
          number: problem.name,
        })
        .from(problem)
        .where(eq(problem.enabled, true))
        .offset(query.offset ?? 0);
    },
    {
      query: t.Object({
        limit: t.Optional(t.Integer()),
        offset: t.Optional(t.Integer({ default: 0 })),
      }),
      detail: {
        summary:
          "Returns minimal data for all problems, or up to a limit if specified",
        description:
          "Returns the id, competition id, name, and problem number for all problems. If a limit or offset are provided, then they are used.",
        tags: ["problem "],
      },
    },
  )
  .get(
    "/problems/:id",
    async ({ params: { id } }) => {
      const result = await db
        .select()
        .from(problem)
        .where(eq(problem.id, id))
        .limit(1);

      if (result.length > 0) {
        return getVisibleProblem(result[0]!);
      }

      return undefined;
    },
    {
      params: t.Object({
        id: t.Integer(),
      }),
      detail: {
        summary: "Get problem by id",
        description: "Retrieves the data for a single problem.",
        tags: ["problem"],
      },
    },
  );
