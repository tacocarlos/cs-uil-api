import { t, type TSchema } from "elysia";
import { and, eq } from "drizzle-orm";
import { competition, problem } from "@db/schemas/core-schema";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import type { SQLWrapper, TableConfig } from "drizzle-orm";

type CompetitionSelectType = typeof competition.$inferSelect;
type ProblemSelectType = typeof problem.$inferSelect;

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
  const { enabled, ...allowedFields } = getFields(problem);
  return allowedFields;
}

export function getPublicProblemData(p: typeof problem.$inferSelect) {
  const { enabled, ...VisibleData } = p;
  return VisibleData;
}

export function shortProblemSelect() {
  return {
    id: problem.id,
    competiton_id: problem.competition,
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
