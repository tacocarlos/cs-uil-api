/**
 * A single row returned by the `getProblems` server action.
 *
 * Defined here as a standalone type so it can be imported by both server
 * modules and client components without pulling in any server-only
 * dependencies (e.g. drizzle-orm, "use server" boundary, etc.).
 */
export type CompetitionLevel =
  | "invA"
  | "invB"
  | "district"
  | "state"
  | "region"
  | "custom";

export type ProblemRow = {
  id: number;
  name: string;
  number: number;
  enabled: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  competitionId: number;
  competitionLevel: CompetitionLevel | null;
  competitionYear: number | null;
};
