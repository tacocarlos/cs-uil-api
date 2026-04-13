import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowLeft, ChevronRight } from "lucide-react";

import { getCompetitionWithProblems } from "@/server/actions/competitions";
import { SiteNavbar } from "@/components/site/site-navbar";
import {
  CompetitionLevelBadge,
  LEVEL_LABELS,
} from "@/components/problems/competition-level-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    notFound();
  }

  const { competition, problems } = await getCompetitionWithProblems(numId);

  if (!competition || !competition.enabled) {
    notFound();
  }

  const visibleProblems = problems.filter((p) => p.enabled);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Back */}
          <Link
            href="/#problems"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All Problems
          </Link>

          {/* Competition header */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CompetitionLevelBadge level={competition.level} />
                <Badge variant="secondary">{competition.year}</Badge>
                <Badge variant="outline">
                  {visibleProblems.length} problem
                  {visibleProblems.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {competition.year}{" "}
                {LEVEL_LABELS[competition.level ?? "custom"] ??
                  competition.level}
              </h1>
            </div>
            <span className="space-x-5">
              {competition.data_zip_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={competition.data_zip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="size-3.5" /> Download Data Zip
                  </a>
                </Button>
              )}

              {competition.student_packet_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={competition.student_packet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="size-3.5" /> Open Student Packet
                  </a>
                </Button>
              )}
            </span>
          </div>

          {/* Problems list */}
          {visibleProblems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No problems are available for this competition yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
              {visibleProblems.map((p) => (
                <Link
                  key={p.id}
                  href={`/problems/${p.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {p.number}
                  </span>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
