"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { ProblemRow } from "@/types/problems";
import type { VerificationStatus } from "@/server/db/schemas/core-schema";
import type { GeneratedOutputKind } from "@/server/judge0/generate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  VerificationBadge,
  needsIntervention,
} from "@/components/admin/verification-badge";
import { regenerateOutputsForProblems } from "@/server/actions/outputs";
import { verifyProblems } from "@/server/actions/verification";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Sort ranking for the verification column — lowest rank first so the
 * problems that need a human sort to the top in ascending order.
 */
const VERIFICATION_SORT_RANK: Record<VerificationStatus, number> = {
  error: 0,
  failed: 1,
  unverified: 2,
  skipped: 3,
  passed: 4,
};

/** Human-readable names for the regeneratable output kinds. */
const OUTPUT_KIND_LABELS: Record<GeneratedOutputKind, string> = {
  test: "test output",
  student: "student output",
};

/** The bulk-regeneration presets offered in the dropdown. */
const REGENERATE_OPTIONS: ReadonlyArray<{
  label: string;
  kinds: GeneratedOutputKind[];
}> = [
  { label: "Test + student output", kinds: ["test", "student"] },
  { label: "Test output only", kinds: ["test"] },
  { label: "Student output only", kinds: ["student"] },
];

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
  | "verification"
  | "createdAt"
  | "updatedAt";

type SortDirection = "asc" | "desc";

/**
 * The `getProblems` projection with the verification fields it now returns.
 * Kept local so the shared `ProblemRow` type stays free of admin-only columns.
 */
type ProblemsTableRow = ProblemRow & {
  verificationStatus: VerificationStatus | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return format(date, "MMM d, yyyy");
}

/** "test output and student output" */
function describeKinds(kinds: GeneratedOutputKind[]): string {
  return kinds.map((kind) => OUTPUT_KIND_LABELS[kind]).join(" and ");
}

function getSortValue(
  problem: ProblemsTableRow,
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
    case "verification":
      return VERIFICATION_SORT_RANK[problem.verificationStatus ?? "unverified"];
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
  problems: ProblemsTableRow[];
}

export function ProblemsTable({ problems }: ProblemsTableProps) {
  // ── Filter / search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
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
    setVerificationFilter("all");
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

  const handleVerificationFilterChange = useCallback((value: string) => {
    setVerificationFilter(value);
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

    // Verification filter
    if (verificationFilter !== "all") {
      result =
        verificationFilter === "needs-review"
          ? result.filter((p) => needsIntervention(p.verificationStatus))
          : result.filter(
              (p) =>
                (p.verificationStatus ?? "unverified") === verificationFilter,
            );
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
    verificationFilter,
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

  const router = useRouter();

  // ── Bulk verification ──────────────────────────────────────────────────
  const [isVerifyingAll, startVerifyingAll] = useTransition();

  const handleVerifyAll = useCallback(() => {
    const confirmed = window.confirm(
      "Verify every problem?\n\nThis re-runs each problem's reference solution on Judge0 and compares its output. It may take several minutes.",
    );
    if (!confirmed) return;

    startVerifyingAll(async () => {
      const result = await verifyProblems();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { summary } = result;
      const checked =
        summary.passed +
        summary.failed +
        summary.error +
        summary.skipped +
        summary.unverified;

      const parts: string[] = [];
      if (summary.passed > 0) parts.push(`${summary.passed} passed`);
      if (summary.failed > 0) parts.push(`${summary.failed} mismatched`);
      if (summary.error > 0) parts.push(`${summary.error} error`);
      if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);

      const message = `${checked} checked${
        parts.length > 0 ? ` — ${parts.join(", ")}` : ""
      }`;

      if (summary.failed > 0 || summary.error > 0) {
        toast.error(message);
      } else {
        toast.success(message);
      }

      router.refresh();
    });
  }, [router]);

  // ── Bulk output regeneration ───────────────────────────────────────────
  const [isRegeneratingAll, startRegeneratingAll] = useTransition();

  /** Non-null while the confirmation dialog is open; holds the chosen kinds. */
  const [pendingKinds, setPendingKinds] = useState<
    GeneratedOutputKind[] | null
  >(null);

  const isBusy = isVerifyingAll || isRegeneratingAll;

  const handleRegenerateConfirm = useCallback(() => {
    const kinds = pendingKinds;
    if (!kinds) return;

    startRegeneratingAll(async () => {
      const result = await regenerateOutputsForProblems(undefined, kinds);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { entries, summary } = result;

      const parts: string[] = [];
      if (summary.applied > 0) parts.push(`${summary.applied} updated`);
      if (summary.unchanged > 0) parts.push(`${summary.unchanged} unchanged`);
      if (summary.failed > 0) parts.push(`${summary.failed} failed`);

      const total = entries.length;
      const message = `${total} ${total === 1 ? "problem" : "problems"}${
        parts.length > 0 ? ` — ${parts.join(", ")}` : ""
      }`;

      if (summary.failed > 0) {
        toast.error(message);
      } else {
        toast.success(message);
      }

      router.refresh();
    });
  }, [pendingKinds, router]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Problems</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyAll}
              disabled={isBusy}
            >
              {isVerifyingAll ? (
                <>
                  <Loader2 className="animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck />
                  Verify All
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBusy}>
                  {isRegeneratingAll ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <RefreshCw />
                      Regenerate Outputs
                      <ChevronDown className="text-muted-foreground" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Regenerate from solution</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REGENERATE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.kinds.join("+")}
                    onSelect={() => setPendingKinds(option.kinds)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {/* Destructive-action confirmation for bulk regeneration */}
      <AlertDialog
        open={pendingKinds !== null}
        onOpenChange={(open) => {
          if (!open) setPendingKinds(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <TriangleAlert className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Regenerate expected output?</AlertDialogTitle>
            <AlertDialogDescription>
              This re-runs{" "}
              <strong className="text-foreground">every problem's</strong>{" "}
              solution on Judge0 to regenerate the{" "}
              <strong className="text-foreground">
                {describeKinds(pendingKinds ?? [])}
              </strong>
              . It may take several minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="-mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              For every problem whose produced output differs, the{" "}
              <strong className="text-foreground">
                stored expected output is overwritten
              </strong>
              . This cannot be undone. Problems whose solution fails to compile
              keep what they have.
            </li>
            <li>
              The expected output then comes from the solution itself, so
              verification can no longer independently disagree with it — each
              affected problem is reset to{" "}
              <strong className="text-foreground">unverified</strong>.
            </li>
            <li>
              This targets{" "}
              <strong className="text-foreground">all problems</strong>, not
              just the rows matching your current filters.
            </li>
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegeneratingAll}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRegeneratingAll}
              onClick={handleRegenerateConfirm}
            >
              {isRegeneratingAll ? "Regenerating…" : "Yes, overwrite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardContent className="flex flex-col gap-4">
        {/* Toolbar */}
        <ProblemsToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          levelFilter={levelFilter}
          onLevelFilterChange={handleLevelFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          verificationFilter={verificationFilter}
          onVerificationFilterChange={handleVerificationFilterChange}
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

                {/* Verified */}
                <TableHead>
                  <SortableHeader
                    column="verification"
                    label="Verified"
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
                    colSpan={8}
                    className="h-36 text-center text-sm text-muted-foreground"
                  >
                    No problems match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((problem) => (
                  <TableRow
                    key={problem.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/problems/edit/${problem.id}`)
                    }
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

                    {/* Verified */}
                    <TableCell>
                      <VerificationBadge status={problem.verificationStatus} />
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
