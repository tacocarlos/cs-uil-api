export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProblemsStats } from "@/components/admin/problems-stats";
import { ProblemsTable } from "@/components/admin/problems-table";
import { UploadCompetitionDialog } from "@/components/admin/upload-competition-dialog";
import { getProblems, getProblemStats } from "@/server/actions/problems";

export default async function ProblemsPage() {
  const [problems, stats] = await Promise.all([
    getProblems(),
    getProblemStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Problems</h1>
          <p className="text-muted-foreground text-sm">
            Manage all competition problems
          </p>
        </div>
        <span className="flex items-center gap-3">
          <UploadCompetitionDialog />
          <Button>
            <Plus />
            New Problem
          </Button>
        </span>
      </div>

      <ProblemsStats stats={stats} />

      <ProblemsTable problems={problems} />
    </div>
  );
}
