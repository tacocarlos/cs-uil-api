import { sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

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

/**
 * Result of executing a problem's reference solution against its judge data.
 *
 * - `unverified` – never checked
 * - `passed`     – produced output matching the expected output
 * - `failed`     – ran successfully but the output did not match (needs review)
 * - `error`      – compile error, runtime error, timeout, or judge unreachable
 *                  (needs review)
 * - `skipped`    – nothing to check (no solution, or no input/expected output)
 */
export const VERIFICATION_STATUSES = [
  "unverified",
  "passed",
  "failed",
  "error",
  "skipped",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Statuses that require a human to look at the problem before enabling it. */
export const VERIFICATION_NEEDS_REVIEW: readonly VerificationStatus[] = [
  "failed",
  "error",
];

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
  // markdown: t.text().notNull(),
  problem_text_url: t.text(),
  // student_data: t.text().notNull(),
  student_data_url: t.text(),
  // student_output: t.text().notNull(),
  student_output_url: t.text(),
  // test_data: t.text().notNull(),
  test_data_url: t.text(),
  // test_output: t.text().notNull(),
  test_output_url: t.text(),
  solution: t.text().notNull(),
  enabled: t.integer({ mode: "boolean" }).default(false),
  /**
   * Judge0 verification state. Internal/admin-only — deliberately excluded
   * from every public API projection (see `publicProblemSelect`).
   */
  verification_status: t
    .text({ enum: VERIFICATION_STATUSES })
    .default("unverified"),
  /** Human-readable report: mismatch diff, compile output, or error detail. */
  verification_message: t.text(),
  verified_at: t.integer({ mode: "timestamp_ms" }),
}));

/**
 * Figures shown in a problem's markdown.
 *
 * The markdown refers to a figure only by its placeholder
 * (`![…](uil-cs-api-figure:1)`); the URL lives here and is handed to clients
 * as a placeholder → URL map.
 * Switching storage providers therefore only rewrites these rows. `key` is
 * the provider's own identifier for the file, used to delete or move it.
 */
export const problemImage = sqliteTable(
  "problem_images",
  (t) => ({
    id: t.integer().primaryKey().notNull(),
    problem: t
      .integer()
      .references(() => problem.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: t.integer({ mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    placeholder: t.text({ length: 32 }).notNull(),
    url: t.text({ length: MAX_URL_LENGTH }).notNull(),
    storage_provider: t.text().notNull().default("uploadthing"),
    storage_key: t.text().notNull(),
    width: t.integer(),
    height: t.integer(),
  }),
  (t) => [uniqueIndex("problem_images_problem_placeholder").on(t.problem, t.placeholder)],
);

export const table = {
  competition,
  problem,
  problemImage,
} as const;

export type Type = typeof table;
