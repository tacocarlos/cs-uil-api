"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Code2, Database, FileText, Pencil } from "lucide-react";
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
      ok:
        p.studentData.trim().length > 0 && p.studentOutput.trim().length > 0,
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

interface ProblemsReviewListProps {
  problems: EditableProblem[];
  onEdit: (index: number) => void;
}

export function ProblemsReviewList({
  problems,
  onEdit,
}: ProblemsReviewListProps) {
  return (
    <div className="divide-y divide-border/40">
      {problems.map((problem, index) => (
        <div
          key={problem.number}
          className="flex items-center gap-3 py-3 pr-1"
        >
          {/* Number */}
          <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
            {problem.number}
          </span>

          {/* Name + dirty indicator */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium">{problem.name}</span>
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

          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(index)}
            aria-label={`Edit problem ${problem.number}`}
          >
            <Pencil />
          </Button>
        </div>
      ))}
    </div>
  );
}
