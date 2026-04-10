"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_LABELS } from "@/components/problems/competition-level-badge";
import type { CompetitionLevel } from "@/types/problems";
import { cn } from "@/lib/utils";

const COMPETITION_LEVELS: CompetitionLevel[] = [
  "invA",
  "invB",
  "district",
  "state",
  "region",
  "custom",
];

export interface PublicToolbarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  levelFilter: string;
  onLevelFilterChange: (v: string) => void;
  yearFilter: string;
  onYearFilterChange: (v: string) => void;
  availableYears: number[];
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
}

export function PublicToolbar({
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  yearFilter,
  onYearFilterChange,
  availableYears,
  totalCount,
  filteredCount,
  onReset,
}: PublicToolbarProps) {
  const hasActiveFilters =
    searchQuery !== "" || levelFilter !== "all" || yearFilter !== "all";

  const isFiltered = filteredCount !== totalCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search problems…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Level filter */}
        <Select value={levelFilter} onValueChange={onLevelFilterChange}>
          <SelectTrigger className="w-38">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {COMPETITION_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {LEVEL_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year filter */}
        <Select value={yearFilter} onValueChange={onYearFilterChange}>
          <SelectTrigger className="w-30">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset button — only visible when a filter is active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Reset all filters"
          >
            <X className="size-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Result count */}
      <p
        className={cn(
          "text-xs text-muted-foreground",
          isFiltered && "font-medium text-foreground/70",
        )}
      >
        {isFiltered ? (
          <>
            Showing{" "}
            <span className="font-semibold text-foreground">{filteredCount}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span>{" "}
            {totalCount === 1 ? "problem" : "problems"}
          </>
        ) : (
          <>{totalCount === 1 ? "1 problem" : `${totalCount} problems`}</>
        )}
      </p>
    </div>
  );
}
