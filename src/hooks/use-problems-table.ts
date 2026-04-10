"use client";

import { useCallback, useMemo, useState } from "react";

import type { ProblemRow } from "@/types/problems";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SortColumn =
  | "id"
  | "name"
  | "number"
  | "level"
  | "year"
  | "status"
  | "createdAt"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

export interface UseProblemsTableOptions {
  defaultSortColumn?: SortColumn;
  defaultPageSize?: number;
}

export interface UseProblemsTableReturn {
  // raw state
  searchQuery: string;
  levelFilter: string;
  statusFilter: string;
  yearFilter: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  currentPage: number;
  pageSize: number;

  // reset-aware handlers
  handleSort: (column: SortColumn) => void;
  handleReset: () => void;
  handleSearchChange: (v: string) => void;
  handleLevelFilterChange: (v: string) => void;
  handleStatusFilterChange: (v: string) => void;
  handleYearFilterChange: (v: string) => void;
  handlePageSizeChange: (v: string) => void;
  setCurrentPage: (n: number) => void;

  // derived
  availableYears: number[];
  filteredAndSorted: ProblemRow[];
  paginatedRows: ProblemRow[];
  totalCount: number;
  filteredCount: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Private helper
// ---------------------------------------------------------------------------

function getSortValue(p: ProblemRow, col: SortColumn): string | number {
  switch (col) {
    case "id":
      return p.id;
    case "name":
      return p.name.toLowerCase();
    case "number":
      return p.number;
    case "level":
      return p.competitionLevel ?? "";
    case "year":
      return p.competitionYear ?? 0;
    case "status":
      return p.enabled === true ? 1 : 0;
    case "createdAt":
      return p.createdAt?.getTime() ?? 0;
    case "updatedAt":
      return p.updatedAt?.getTime() ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProblemsTable(
  problems: ProblemRow[],
  options?: UseProblemsTableOptions,
): UseProblemsTableReturn {
  const { defaultSortColumn = "id", defaultPageSize = 10 } = options ?? {};

  // ---- state ---------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ---- derived: availableYears ---------------------------------------------
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const p of problems) {
      if (p.competitionYear !== null && p.competitionYear !== undefined) {
        years.add(p.competitionYear);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [problems]);

  // ---- derived: filteredAndSorted ------------------------------------------
  const filteredAndSorted = useMemo(() => {
    let rows = problems;

    // search (case-insensitive on .name)
    if (searchQuery.trim() !== "") {
      const lower = searchQuery.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(lower));
    }

    // level filter
    if (levelFilter !== "all") {
      rows = rows.filter((p) => p.competitionLevel === levelFilter);
    }

    // status filter
    if (statusFilter !== "all") {
      const wantEnabled = statusFilter === "enabled";
      rows = rows.filter((p) =>
        wantEnabled ? p.enabled === true : p.enabled !== true,
      );
    }

    // year filter
    if (yearFilter !== "all") {
      const y = Number(yearFilter);
      rows = rows.filter((p) => p.competitionYear === y);
    }

    // sort
    rows = [...rows].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      let cmp = 0;
      if (aVal < bVal) cmp = -1;
      else if (aVal > bVal) cmp = 1;

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [problems, searchQuery, levelFilter, statusFilter, yearFilter, sortColumn, sortDirection]);

  // ---- derived: pagination -------------------------------------------------
  const totalCount = problems.length;
  const filteredCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const paginatedRows = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSorted.slice(start, end);
  }, [filteredAndSorted, currentPage, totalPages, pageSize]);

  // ---- handlers ------------------------------------------------------------
  const handleSort = useCallback(
    (column: SortColumn) => {
      setSortColumn((prev) => {
        if (prev === column) {
          setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
          setSortDirection("asc");
        }
        return column;
      });
      setCurrentPage(1);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setLevelFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
    setSortColumn(defaultSortColumn);
    setSortDirection("asc");
    setCurrentPage(1);
    setPageSize(defaultPageSize);
  }, [defaultSortColumn, defaultPageSize]);

  const handleSearchChange = useCallback((v: string) => {
    setSearchQuery(v);
    setCurrentPage(1);
  }, []);

  const handleLevelFilterChange = useCallback((v: string) => {
    setLevelFilter(v);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v);
    setCurrentPage(1);
  }, []);

  const handleYearFilterChange = useCallback((v: string) => {
    setYearFilter(v);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((v: string) => {
    setPageSize(Number(v));
    setCurrentPage(1);
  }, []);

  // ---- return --------------------------------------------------------------
  return {
    // raw state
    searchQuery,
    levelFilter,
    statusFilter,
    yearFilter,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize,

    // handlers
    handleSort,
    handleReset,
    handleSearchChange,
    handleLevelFilterChange,
    handleStatusFilterChange,
    handleYearFilterChange,
    handlePageSizeChange,
    setCurrentPage,

    // derived
    availableYears,
    filteredAndSorted,
    paginatedRows,
    totalCount,
    filteredCount,
    totalPages,
  };
}
