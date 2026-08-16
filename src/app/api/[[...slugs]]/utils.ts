import { t, type TSchema } from "elysia";
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
  id: t.Number(),
  competition_id: t.Number(),
  name: t.String(),
  number: t.Number(),
});

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
  return t.Object({ id: t.Number() });
}

export function ParamsWithId<T extends TSchema>(otherParams: T) {
  const idObject = t.Object({ id: t.Number() });
  return t.Composite([idObject, otherParams]);
}

export function ProblemEnabled() {
  return eq(problem.enabled, true);
}

export function WithProblemEnabled<T extends SQLWrapper>(op: T) {
  return and(eq(problem.enabled, true), op);
}
