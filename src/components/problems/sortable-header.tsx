"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SortColumn, SortDirection } from "@/hooks/use-problems-table";
import { cn } from "@/lib/utils";

export interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
  className?: string;
}

export function SortableHeader({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
  className,
}: SortableHeaderProps): React.ReactElement {
  const isActive = sortColumn === column;

  const Icon = isActive
    ? sortDirection === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className={cn(
        "font-medium",
        align === "left" ? "-ml-3" : "-mr-3 flex-row-reverse",
        className,
      )}
    >
      {label}
      <Icon
        className={cn(
          "shrink-0",
          isActive ? "text-muted-foreground" : "text-muted-foreground/40",
        )}
      />
    </Button>
  );
}
