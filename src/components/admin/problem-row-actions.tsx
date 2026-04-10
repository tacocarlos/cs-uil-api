"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ProblemRow } from "@/types/problems";

interface ProblemRowActionsProps {
  problem: ProblemRow;
}

export function ProblemRowActions({ problem }: ProblemRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open problem actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Problem #{problem.number}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            console.log("[ProblemRowActions] View problem:", problem.id);
          }}
        >
          <Eye />
          View Problem
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            console.log("[ProblemRowActions] Edit problem:", problem.id);
          }}
        >
          <Pencil />
          Edit Problem
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            console.log("[ProblemRowActions] Delete problem:", problem.id);
          }}
        >
          <Trash2 />
          Delete Problem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
