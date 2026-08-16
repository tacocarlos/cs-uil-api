"use client";

import type { ReactNode } from "react";
import {
  needsIntervention,
  VerificationBadge,
  verificationDescription,
  verificationLabel,
} from "@/components/admin/verification-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Code2,
  Database,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditableProblem } from "./types";

function completenessIcons(
  p: EditableProblem,
): Array<{ label: string; ok: boolean; icon: ReactNode }> {
  return [
    {
      label: "Problem Statement",
      ok: p.markdown.trim().length > 0,
      icon: <FileText className="size-3" />,
    },
    {
      label: "Student I/O",
      ok: p.studentData.trim().length > 0 && p.studentOutput.trim().length > 0,
      icon: <Database className="size-3" />,
    },
    {
      label: "Test I/O",
      ok: p.testData.trim().length > 0 && p.testOutput.trim().length > 0,
      icon: <Database className="size-3" />,
    },
    {
      label: "Solution",
      ok: p.solution.trim().length > 0,
      icon: <Code2 className="size-3" />,
    },
  ];
}

/**
 * Second line of the verification tooltip: for statuses that need review we
 * surface the first case's message (the concrete mismatch/error), otherwise we
 * fall back to the generic status description.
 */
function verificationDetail(p: EditableProblem): string {
  const status = p.verification?.status;

  if (needsIntervention(status)) {
    const caseMessage = p.verification?.cases?.[0]?.message;
    if (caseMessage) return caseMessage;
  }

  return verificationDescription(status);
}

interface ProblemsReviewListProps {
  problems: EditableProblem[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onToggleAll: (enabled: boolean) => void;
}

export function ProblemsReviewList({
  problems,
  onEdit,
  onRemove,
  onToggleAll,
}: ProblemsReviewListProps) {
  const allEnabled = problems.length > 0 && problems.every((p) => p.enabled);
  const reviewCount = problems.filter((p) =>
    needsIntervention(p.verification?.status),
  ).length;

  return (
    <div>
      {/* Enable-all toggle */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-border/60">
        <span className="text-xs font-medium text-muted-foreground">
          Enable all problems
        </span>
        <Switch
          size="sm"
          checked={allEnabled}
          onCheckedChange={onToggleAll}
          aria-label="Enable or disable all problems"
        />
      </div>

      {/* Verification summary — only when something needs a human */}
      {reviewCount > 0 && (
        <div className="mb-1 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 dark:border-amber-400/30 dark:bg-amber-400/10">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-medium">
              {reviewCount} {reviewCount === 1 ? "problem" : "problems"} need
              {reviewCount === 1 ? "s" : ""} review before publishing.
            </span>{" "}
            The reference solution did not match the expected output. Open a
            problem and use “Generate Expected Output” to rebuild the expected
            output from the solution — the extracted output is often the wrong
            side. Affected problems stay disabled by “Enable all” until the
            check passes.
          </p>
        </div>
      )}

      <div className="divide-y divide-border/40">
        {problems.map((problem, index) => (
          <div
            key={problem.number}
            className={cn(
              "flex items-center gap-3 border-l-2 border-transparent py-3 pr-1 pl-2",
              needsIntervention(problem.verification?.status) &&
                "border-amber-500/70 bg-amber-500/5 dark:border-amber-400/70 dark:bg-amber-400/5",
            )}
          >
            {/* Number */}
            <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
              {problem.number}
            </span>

            {/* Name + dirty indicator */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate text-sm font-medium">
                {problem.name}
              </span>
              {problem.isDirty && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                  title="Unsaved changes"
                />
              )}
            </div>

            {/* Completeness icons — each wrapped in a Tooltip */}
            <div className="flex items-center gap-1">
              {completenessIcons(problem).map(({ label, ok, icon }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded",
                        ok
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {icon}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {label}: {ok ? "Present" : "Missing"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Verification status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 items-center">
                  <VerificationBadge
                    status={problem.verification?.status}
                    iconOnly
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">
                  {verificationLabel(problem.verification?.status)}
                </p>
                <p className="whitespace-pre-wrap">
                  {verificationDetail(problem)}
                </p>
                {needsIntervention(problem.verification?.status) && (
                  <p className="mt-1 text-muted-foreground">
                    Tip: regenerate the expected output from the solution in the
                    editor.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(index)}
              aria-label={`Edit problem ${problem.number}`}
            >
              <Pencil />
            </Button>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(index)}
              aria-label={`Remove problem ${problem.number}`}
              className="text-muted-foreground/50 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
