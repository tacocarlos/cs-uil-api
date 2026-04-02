import { table } from "./schemas/core-schema";
import { spreads } from "./utils";

export const db = {
  insert: spreads(
    {
      problem: table.problem,
      competition: table.competition,
    },
    "insert",
  ),
  select: spreads(
    {
      problem: table.problem,
      competition: table.competition,
    },
    "select",
  ),
} as const;
