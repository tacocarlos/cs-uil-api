import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/components/problems/competition-level-badge";
import { getCompetitionWithProblems } from "@/server/actions/competitions";
import { CompetitionEditForm } from "@/components/admin/competitions/competition-edit-form";
import type { CompetitionLevel } from "@/types/problems";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompetitionEditPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (Number.isNaN(numId)) {
    notFound();
  }

  const { competition, problems } = await getCompetitionWithProblems(numId);

  if (!competition) {
    notFound();
  }

  const levelLabel =
    LEVEL_LABELS[(competition.level ?? "custom") as CompetitionLevel] ??
    competition.level;

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          asChild
          className="shrink-0"
        >
          <Link href="/admin/problems">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {competition.year} {levelLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {problems.length} problem{problems.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Edit form ─────────────────────────────────────────────────────── */}
      <CompetitionEditForm competition={competition} problems={problems} />
    </div>
  );
}
