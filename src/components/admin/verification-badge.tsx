"use client";

import {
  AlertTriangle,
  CircleDashed,
  CircleSlash,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@/server/db/schemas/core-schema";

/** Statuses that require a human to review the problem before publishing. */
export function needsIntervention(
  status: VerificationStatus | null | undefined,
): boolean {
  return status === "failed" || status === "error";
}

const CONFIG: Record<
  VerificationStatus,
  {
    label: string;
    description: string;
    icon: typeof ShieldCheck;
    className: string;
  }
> = {
  passed: {
    label: "Verified",
    description: "Solution output matched the expected output.",
    icon: ShieldCheck,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  failed: {
    label: "Mismatch",
    description:
      "Solution ran but its output did not match the expected output. Needs review.",
    icon: XCircle,
    className:
      "border-red-500/20 bg-red-500/10 text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400",
  },
  error: {
    label: "Run error",
    description:
      "Solution failed to compile or run, or the judge was unreachable. Needs review.",
    icon: AlertTriangle,
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
  },
  skipped: {
    label: "Not checkable",
    description:
      "No solution, or no input/expected-output pair to check against.",
    icon: CircleSlash,
    className:
      "border-border/60 bg-muted/40 text-muted-foreground dark:bg-muted/20",
  },
  unverified: {
    label: "Unchecked",
    description: "This problem has not been verified yet.",
    icon: CircleDashed,
    className:
      "border-border/60 bg-muted/40 text-muted-foreground dark:bg-muted/20",
  },
};

export function verificationLabel(
  status: VerificationStatus | null | undefined,
): string {
  return CONFIG[status ?? "unverified"].label;
}

export function verificationDescription(
  status: VerificationStatus | null | undefined,
): string {
  return CONFIG[status ?? "unverified"].description;
}

interface VerificationBadgeProps {
  status: VerificationStatus | null | undefined;
  /** Render only the icon (for dense table cells). */
  iconOnly?: boolean;
}

export function VerificationBadge({
  status,
  iconOnly = false,
}: VerificationBadgeProps) {
  const config = CONFIG[status ?? "unverified"];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={config.className}
      title={config.description}
    >
      <Icon />
      {!iconOnly && config.label}
    </Badge>
  );
}
