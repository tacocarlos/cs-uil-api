"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { ProblemRow } from "@/types/problems";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProblemsToolbar } from "@/components/admin/problems-toolbar";
import { ProblemStatusBadge } from "@/components/admin/problem-status-badge";
import { ProblemRowActions } from "@/components/admin/problem-row-actions";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortColumn =
  | "id"
  | "name"
  | "number"
  | "level"
  | "year"
  | "status"
  | "createdAt"
  | "updatedAt";

type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return format(date, "MMM d, yyyy");
}

function getSortValue(
  problem: ProblemRow,
  column: SortColumn,
): string | number {
  switch (column) {
    case "id":
      return problem.id;
    case "name":
      return problem.name.toLowerCase();
    case "number":
      return problem.number;
    case "level":
      return problem.competitionLevel ?? "";
    case "year":
      return problem.competitionYear ?? 0;
    case "status":
      return problem.enabled === true ? 1 : 0;
    case "createdAt":
      return problem.createdAt?.getTime() ?? 0;
    case "updatedAt":
      return problem.updatedAt?.getTime() ?? 0;
  }
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
  className?: string;
}

function SortableHeader({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
  className,
}: SortableHeaderProps) {
  const isActive = sortColumn === column;

  const SortIcon = isActive
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
        "h-8 gap-1 font-medium text-foreground hover:bg-muted/60",
        align === "left" ? "-ml-3" : "-mr-3 flex-row-reverse",
        isActive && "text-foreground",
        className,
      )}
    >
      {label}
      <SortIcon
        className={cn(
          "size-3.5",
          isActive ? "text-muted-foreground" : "text-muted-foreground/40",
        )}
      />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// ProblemsTable
// ---------------------------------------------------------------------------

interface ProblemsTableProps {
  problems: ProblemRow[];
}

export function ProblemsTable({ problems }: ProblemsTableProps) {
  // ── Filter / search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // ── Sort state ─────────────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState<SortColumn>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // ── Pagination state ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // ── Derived: available years ───────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const p of problems) {
      if (p.competitionYear !== null) years.add(p.competitionYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [problems]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
      setCurrentPage(1);
    },
    [sortColumn],
  );

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setLevelFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleLevelFilterChange = useCallback((value: string) => {
    setLevelFilter(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleYearFilterChange = useCallback((value: string) => {
    setYearFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  }, []);

  // ── Filtered + sorted data ─────────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    let result = [...problems];

    // Search — case-insensitive match on name
    if (searchQuery.trim() !== "") {
      const lower = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(lower));
    }

    // Level filter
    if (levelFilter !== "all") {
      result = result.filter((p) => p.competitionLevel === levelFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const wantActive = statusFilter === "active";
      result = result.filter((p) => (p.enabled === true) === wantActive);
    }

    // Year filter
    if (yearFilter !== "all") {
      const year = Number(yearFilter);
      result = result.filter((p) => p.competitionYear === year);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    problems,
    searchQuery,
    levelFilter,
    statusFilter,
    yearFilter,
    sortColumn,
    sortDirection,
  ]);

  // ── Pagination computations ────────────────────────────────────────────
  const totalCount = problems.length;
  const filteredCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  // ── Shared sort header props ───────────────────────────────────────────
  const sortProps = { sortColumn, sortDirection, onSort: handleSort };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle>Problems</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Toolbar */}
        <ProblemsToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          levelFilter={levelFilter}
          onLevelFilterChange={handleLevelFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          yearFilter={yearFilter}
          onYearFilterChange={handleYearFilterChange}
          availableYears={availableYears}
          totalCount={totalCount}
          filteredCount={filteredCount}
          onReset={handleReset}
        />

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* # */}
                <TableHead className="w-16">
                  <div className="flex justify-end">
                    <SortableHeader
                      column="number"
                      label="#"
                      align="right"
                      {...sortProps}
                    />
                  </div>
                </TableHead>

                {/* Name */}
                <TableHead>
                  <SortableHeader column="name" label="Name" {...sortProps} />
                </TableHead>

                {/* Competition */}
                <TableHead>
                  <SortableHeader
                    column="year"
                    label="Competition"
                    {...sortProps}
                  />
                </TableHead>

                {/* Status */}
                <TableHead>
                  <SortableHeader
                    column="status"
                    label="Status"
                    {...sortProps}
                  />
                </TableHead>

                {/* Created */}
                <TableHead>
                  <SortableHeader
                    column="createdAt"
                    label="Created"
                    {...sortProps}
                  />
                </TableHead>

                {/* Updated */}
                <TableHead>
                  <SortableHeader
                    column="updatedAt"
                    label="Updated"
                    {...sortProps}
                  />
                </TableHead>

                {/* Actions — not sortable */}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="h-36 text-center text-sm text-muted-foreground"
                  >
                    No problems match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((problem) => (
                  <TableRow key={problem.id}>
                    {/* # */}
                    <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {problem.number}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-1 font-medium">
                        {problem.name}
                      </span>
                    </TableCell>

                    {/* Competition */}
                    <TableCell className="text-sm text-muted-foreground">
                      {problem.competitionYear !== null ||
                      problem.competitionLevel !== null ? (
                        <span>
                          {[problem.competitionYear, problem.competitionLevel]
                            .filter(
                              (v): v is NonNullable<typeof v> => v !== null,
                            )
                            .join(" ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <ProblemStatusBadge enabled={problem.enabled} />
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(problem.createdAt)}
                    </TableCell>

                    {/* Updated */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(problem.updatedAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <ProblemRowActions problem={problem} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Page size selector */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1.5">
            <span className="min-w-28 text-center text-sm text-muted-foreground">
              Page{" "}
              <span className="font-medium text-foreground">{safePage}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>

            {/* First page */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              aria-label="Go to first page"
            >
              <ChevronsLeft />
            </Button>

            {/* Previous page */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft />
            </Button>

            {/* Next page */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight />
            </Button>

            {/* Last page */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Go to last page"
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
