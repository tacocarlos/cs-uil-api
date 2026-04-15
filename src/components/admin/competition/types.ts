import type { ExtractedProblem } from "@/server/extraction/types";

export interface EditableProblem extends ExtractedProblem {
  /** True when local edits have not been committed to the parent state */
  isDirty: boolean;
  /** Whether this problem will be visible to students after saving */
  enabled: boolean;
}

export interface CompetitionFormState {
  year: string; // empty string = not set
  level: string; // one of the COMPETITION_LEVELS or ""
  enabled: boolean;
  studentPacketUrl: string;
  dataZipUrl: string;
}

export const COMPETITION_LEVELS = [
  "invA",
  "invB",
  "district",
  "state",
  "region",
  "custom",
] as const;

export const LEVEL_LABELS: Record<string, string> = {
  invA: "Invitational A",
  invB: "Invitational B",
  district: "District",
  state: "State",
  region: "Region",
  custom: "Custom",
};
