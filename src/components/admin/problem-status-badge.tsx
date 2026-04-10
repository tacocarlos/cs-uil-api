"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProblemStatusBadgeProps {
  enabled: boolean | null;
}

export function ProblemStatusBadge({ enabled }: ProblemStatusBadgeProps) {
  if (enabled === true) {
    return (
      <Badge
        variant="secondary"
        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
      >
        <CheckCircle2 />
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <XCircle />
      Inactive
    </Badge>
  );
}
