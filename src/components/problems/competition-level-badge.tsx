import React from "react";

import type { CompetitionLevel } from "@/types/problems";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const LEVEL_LABELS: Record<CompetitionLevel, string> = {
  invA: "Invitational A",
  invB: "Invitational B",
  district: "District",
  state: "State",
  region: "Region",
  custom: "Custom",
};

export const LEVEL_SHORT: Record<CompetitionLevel, string> = {
  invA: "Inv A",
  invB: "Inv B",
  district: "District",
  state: "State",
  region: "Region",
  custom: "Custom",
};

const LEVEL_CLASSES: Record<CompetitionLevel, string> = {
  invA: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400",
  invB: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-400",
  district:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400",
  state: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  region:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  custom: "border-border text-muted-foreground",
};

export function CompetitionLevelBadge({
  level,
  short = false,
}: {
  level: CompetitionLevel | null;
  short?: boolean;
}): React.ReactElement {
  if (level === null) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  const label = short ? LEVEL_SHORT[level] : LEVEL_LABELS[level];

  return (
    <Badge variant="outline" className={cn(LEVEL_CLASSES[level])}>
      {label}
    </Badge>
  );
}
