"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProblemRow } from "@/types/problems";
import { useProblemsTable } from "@/hooks/use-problems-table";
import { PublicToolbar } from "@/components/problems/public-toolbar";
import { SortableHeader } from "@/components/problems/sortable-header";
import { CompetitionLevelBadge } from "@/components/problems/competition-level-badge";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return format(date, "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// PublicTable
// ---------------------------------------------------------------------------

interface PublicTableProps {
  problems: ProblemRow[];
}

export function PublicTable({ problems }: PublicTableProps) {
  const {
    searchQuery,
    levelFilter,
    yearFilter,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize,
    handleSort,
    handleReset,
    handleSearchChange,
    handleLevelFilterChange,
    handleYearFilterChange,
    handlePageSizeChange,
    setCurrentPage,
    availableYears,
    paginatedRows,
    totalCount,
    filteredCount,
    totalPages,
  } = useProblemsTable(problems);

  const router = useRouter();

  // Clamp current page to valid range for display + navigation
  const safePage = Math.min(currentPage, totalPages);

  // Shared sort header props
  const sortProps = { sortColumn, sortDirection, onSort: handleSort };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problems</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Toolbar */}
        <PublicToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          levelFilter={levelFilter}
          onLevelFilterChange={handleLevelFilterChange}
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
                  <SortableHeader column="year" label="Year" {...sortProps} />
                </TableHead>

                {/*{/* Added */}
                {/*<TableHead>
                  <SortableHeader
                    column="createdAt"
                    label="Added"
                    {...sortProps}
                  />
                </TableHead>*/}
                <TableHead>
                  <SortableHeader
                    column="level"
                    label="Competition Level"
                    {...sortProps}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-36 text-center text-sm text-muted-foreground"
                  >
                    No problems match your search.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((problem) => (
                  <TableRow
                    key={problem.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/problems/${problem.id}`)}
                  >
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
                    <TableCell>
                      {problem.competitionYear ?? "Unknown"}
                    </TableCell>

                    {/*{/* Added */}
                    {/*<TableCell className="text-sm text-muted-foreground">
                      {formatDate(problem.createdAt)}
                    </TableCell>*/}
                    <TableCell className="text-sm text-muted-foreground">
                      <CompetitionLevelBadge
                        level={problem.competitionLevel}
                        short
                      />
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
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft />
            </Button>

            {/* Next page */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
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
