import { Elysia, status, t, type TSchema } from "elysia";
import { createSelectSchema } from "drizzle-typebox";
import { and, eq } from "drizzle-orm";
import { competition, problem } from "@db/schemas/core-schema";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import type { SQLWrapper, TableConfig } from "drizzle-orm";

type CompetitionSelectType = typeof competition.$inferSelect;
type ProblemSelectType = typeof problem.$inferSelect;

const _problemSelectSchema = createSelectSchema(problem);
const _competitionSelectSchema = createSelectSchema(competition);

/**
 * Columns that must never be exposed through the public API.
 *
 * `TProblemSchema` is derived from `createSelectSchema(problem)`, so any column
 * added to the `problem` table is published automatically unless it is listed
 * here. Keep this in sync with `publicProblemSelect` / `getPublicProblemData`.
 */
const PROBLEM_PRIVATE_FIELDS = [
  "enabled",
  "verification_status",
  "verification_message",
  "verified_at",
] as const;

export const TProblemSchema = t.Omit(_problemSelectSchema, [
  ...PROBLEM_PRIVATE_FIELDS,
]);
export const TCompetitionSchema = t.Omit(_competitionSelectSchema, ["enabled"]);
export const TShortProblemSchema = t.Object({
  id: t.Integer(),
  competition_id: t.Integer(),
  name: t.String(),
  number: t.Integer(),
});
export const TProblemMarkdownSchema = t.Object({
  markdown: t.String({
    description:
      "Problem statement as GitHub-flavoured markdown. Figures appear as image " +
      "links whose target is a placeholder, e.g. `![Figure 1](uil-cs-api-figure:1)`; " +
      "look the placeholder up in `images` to get the URL.",
  }),
  images: t.Record(t.String(), t.String(), {
    description:
      "Figure placeholder → current image URL. Resolve placeholders at render " +
      "time rather than caching URLs, since they change if storage moves.",
  }),
});
export const TApiErrorSchema = t.Object({
  message: t.String(),
});

/**
 * Named response schemas. Registering them as models puts them under
 * `components/schemas` in the OpenAPI spec, so generated SDKs get classes named
 * `Problem`, `Competition`, etc. instead of per-endpoint inline types. Model
 * names become public class names in those SDKs, so avoid renaming them.
 */
export const ApiModels = new Elysia({ name: "uil-api-models" }).model({
  Problem: TProblemSchema,
  ShortProblem: TShortProblemSchema,
  Competition: TCompetitionSchema,
  ProblemMarkdown: TProblemMarkdownSchema,
  ApiError: TApiErrorSchema,
});

export function notFound(message: string) {
  return status(404, { message });
}

function getFields<T extends TableConfig>(table: SQLiteTableWithColumns<T>) {
  const {
    _,
    $inferSelect,
    $inferInsert,
    shouldOmitSQLParens,
    getSQL,
    ...fields
  } = table;

  return fields;
}

export function getPublicCompetitionData(c: typeof competition.$inferSelect) {
  const { enabled, ...VisibleData } = c;
  return VisibleData;
}

export function publicProblemSelect() {
  const {
    enabled,
    verification_status,
    verification_message,
    verified_at,
    ...allowedFields
  } = getFields(problem);
  return allowedFields;
}

export function getPublicProblemData(p: typeof problem.$inferSelect) {
  const {
    enabled,
    verification_status,
    verification_message,
    verified_at,
    ...VisibleData
  } = p;
  return VisibleData;
}

export function shortProblemSelect() {
  return {
    id: problem.id,
    competition_id: problem.competition,
    name: problem.name,
    number: problem.number,
  };
}

export function getShortProblemData(p: ProblemSelectType) {
  return {
    id: p.id,
    competition_id: p.competition,
    name: p.name,
    number: p.number,
  };
}

/**
 * An optional integer query parameter that tolerates empty-string values.
 *
 * Query params always arrive as strings, and OpenAPI doc UIs (plus some HTTP
 * clients) serialize omitted optional params as empty strings (e.g.
 * `?limit=&offset=`). `t.Optional(t.Integer())` rejects those with a 422
 * because the property is present but cannot coerce to an integer. This
 * coerces at the schema level, so it runs identically in local dev and in
 * Vercel's AOT-compiled serverless build (unlike a `transform` hook that
 * mutates `context.query`).
 */
export function OptionalInt(defaultValue?: number) {
  return t.Optional(
    t
      .Transform(t.Union([t.String(), t.Integer()]))
      .Decode((value): number | undefined => {
        if (value === "" || value === undefined) return defaultValue;
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isInteger(parsed)) {
          throw new Error("Expected integer");
        }
        return parsed;
      })
      .Encode((value) => value ?? defaultValue ?? 0),
  );
}

export function IdParam() {
  return t.Object({ id: t.Integer() });
}

export function ParamsWithId<T extends TSchema>(otherParams: T) {
  const idObject = t.Object({ id: t.Integer() });
  return t.Composite([idObject, otherParams]);
}

export function ProblemEnabled() {
  return eq(problem.enabled, true);
}

export function WithProblemEnabled<T extends SQLWrapper>(op: T) {
  return and(eq(problem.enabled, true), op);
}
