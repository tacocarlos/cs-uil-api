import { ArrowRight, BookOpen, Trophy } from "lucide-react";
import Link from "next/link";

import {
  CompetitionLevelBadge,
  LEVEL_LABELS,
} from "@/components/problems/competition-level-badge";
import { SiteNavbar } from "@/components/site/site-navbar";
import {
  getCompetitionsWithCounts,
  type CompetitionWithCounts,
} from "@/server/actions/competitions";

export default async function CompetitionsPage() {
  const all = await getCompetitionsWithCounts();
  const visible = all.filter((c: CompetitionWithCounts) => c.enabled);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              Competitions
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse UIL CS competition packets and their problems.
            </p>
          </div>

          {/* Empty state */}
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center">
              <Trophy className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">
                No competitions available yet.
              </p>
            </div>
          ) : (
            /* Competition card grid */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((comp: CompetitionWithCounts) => (
                <Link
                  key={comp.id}
                  href={`/competitions/${comp.id}`}
                  className="group block"
                >
                  <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-border hover:shadow-md group-hover:bg-muted/20">
                    {/* Year + level */}
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <span className="font-heading text-4xl font-bold tabular-nums text-foreground">
                        {comp.year}
                      </span>
                      <CompetitionLevelBadge level={comp.level} />
                    </div>

                    {/* Title */}
                    <p className="mb-4 font-medium text-foreground">
                      {LEVEL_LABELS[comp.level ?? "custom"] ?? comp.level}{" "}
                      Competition
                    </p>

                    {/* Footer: problem count + arrow */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5" />
                        {comp.enabledProblems} problem
                        {comp.enabledProblems !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-0.5 font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        View <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Lunar CS
        </div>
      </footer>
    </div>
  );
}
