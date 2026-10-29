import { Elysia, t } from "elysia";
import { db } from "@/server/db";
import { problem } from "@/server/db/schemas/core-schema";
import { eq } from "drizzle-orm";
import { getProblemImageMap } from "@/server/problem-images";
import {
  ApiModels,
  IdParam,
  notFound,
  OptionalInt,
  ProblemEnabled,
  publicProblemSelect,
  shortProblemSelect,
  WithProblemEnabled,
} from "../utils";

// `normalize: "typebox"` makes response cleaning use TypeBox's runtime
// `Value.Clean` instead of Elysia's default "exact mirror" codegen. The
// generated code path gets mangled by Next.js/Vercel's SWC minification in the
// serverless build, which rewrote valid rows to `null` and produced a 422
// (`{"type":"validation","on":"response","found":[null]}`). The runtime path is
// minification-safe.
export const ProblemAPI = new Elysia({ normalize: "typebox" })
  .use(ApiModels)
  .get(
    "/problems/",
    async ({ query }) => {
      if (query.limit !== undefined) {
        return await db
          .select(shortProblemSelect())
          .from(problem)
          .where(ProblemEnabled())
          .limit(query.limit)
          .offset(query.offset ?? 0);
      }

      return await db
        .select(shortProblemSelect())
        .from(problem)
        .where(ProblemEnabled())
        .offset(query.offset ?? 0);
    },
    {
      query: t.Object({
        limit: OptionalInt(),
        offset: OptionalInt(0),
      }),
      response: t.Array(t.Ref("ShortProblem")),
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

      if (result.length === 0) {
        return notFound(`Problem ${id} not found`);
      }

      return result[0]!;
    },
    {
      params: IdParam(),
      response: { 200: "Problem", 404: "ApiError" },
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
        return notFound(`No markdown for problem ${id}`);
      }

      const url = dbRes[0]!.url;
      const [md, images] = await Promise.all([
        fetch(url).then((res) => res.text()),
        getProblemImageMap(id),
      ]);
      return {
        markdown: md,
        images,
      };
    },
    {
      params: IdParam(),
      response: { 200: "ProblemMarkdown", 404: "ApiError" },
      detail: {
        operationId: "getProblemMarkdownById",
        summary: "Get problem markdown by id",
        description:
          "Returns the problem statement and the URLs of its figures. The " +
          "markdown refers to each figure by placeholder; substitute the URL " +
          "from `images` when rendering.",
        tags: ["problem"],
      },
    },
  );
