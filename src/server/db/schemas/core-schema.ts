import { sqliteTable } from "drizzle-orm/sqlite-core";

const MAX_URL_LENGTH = 2083;
const COMPETITION_LEVELS = [
  "invA",
  "invB",
  "district",
  "state",
  "region",
  "custom",
] as const;

export const competition = sqliteTable("competitions", (t) => ({
  id: t.integer().primaryKey(),
  createdAt: t.integer({ mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: t.integer({ mode: "timestamp_ms" }).$onUpdateFn(() => new Date()),
  level: t.text({ enum: COMPETITION_LEVELS }).$defaultFn(() => "custom"),
  year: t.integer().notNull(),
  student_packet_url: t.text({ length: MAX_URL_LENGTH }).notNull(),
  data_zip_url: t.text({ length: MAX_URL_LENGTH }).notNull(),
  enabled: t.integer({ mode: "boolean" }).default(false),
}));

const NAME_LENGTH = 128;

export const problem = sqliteTable("problems", (t) => ({
  id: t.integer().primaryKey().notNull(),
  competition: t
    .integer()
    .references(() => competition.id)
    .notNull(),
  createdAt: t.integer({ mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: t.integer({ mode: "timestamp_ms" }).$onUpdateFn(() => new Date()),
  name: t.text({ length: NAME_LENGTH }).notNull(),
  number: t.integer().notNull(),
  markdown: t.text().notNull(),
  pdf_url: t.text({ length: MAX_URL_LENGTH }).notNull(),
  student_data: t.text().notNull(),
  student_output: t.text().notNull(),
  test_data: t.text().notNull(),
  test_output: t.text().notNull(),
  solution: t.text().notNull(),
  enabled: t.integer({ mode: "boolean" }).default(false),
}));

export const table = {
  competition,
  problem,
} as const;

export type Type = typeof table;
