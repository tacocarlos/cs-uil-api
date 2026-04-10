import { BookOpen, Moon, Trophy, CalendarDays } from "lucide-react";

import { getEnabledProblems } from "@/server/actions/problems";
import { SiteNavbar } from "@/components/site/site-navbar";
import { PublicTable } from "@/components/problems/public-table";
import { Separator } from "@/components/ui/separator";

export default async function Home() {
  const problems = await getEnabledProblems();

  // Compute lightweight stats directly from the fetched rows — no extra query.
  const uniqueYears = new Set(
    problems
      .map((p) => p.competitionYear)
      .filter((y): y is number => y !== null),
  ).size;

  const uniqueLevels = new Set(
    problems
      .map((p) => p.competitionLevel)
      .filter((l): l is NonNullable<typeof l> => l !== null),
  ).size;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Sticky top nav ─────────────────────────────────────────────── */}
      <SiteNavbar />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative border-b border-border/60 bg-linear-to-b from-primary/5 via-primary/2 to-background">
        {/* Subtle grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,theme(colors.border/40%)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/40%)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28">
          {/* Pill tag */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen className="size-3" />
            Texas UIL Computer Science
          </div>

          {/* Headline */}
          <h1 className="font-heading mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Practice Problems
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Browse CS UIL Problems
          </p>

          {/* Stats strip */}
          {/*<div className="inline-flex items-center gap-8 rounded-2xl border border-border/70 bg-card px-8 py-4 shadow-sm sm:gap-12">
            <div className="flex flex-col items-center gap-0.5">
              <div className="mb-1 flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-3.5 text-primary" />
              </div>
              <span className="font-heading text-2xl font-bold tabular-nums">
                {problems.length}
              </span>
              <span className="text-xs text-muted-foreground">Problems</span>
            </div>

            <Separator orientation="vertical" className="h-14" />

            <div className="flex flex-col items-center gap-0.5">
              <div className="mb-1 flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="size-3.5 text-primary" />
              </div>
              <span className="font-heading text-2xl font-bold tabular-nums">
                {uniqueYears}
              </span>
              <span className="text-xs text-muted-foreground">
                {uniqueYears === 1 ? "Year" : "Years"}
              </span>
            </div>

            <Separator orientation="vertical" className="h-14" />

            <div className="flex flex-col items-center gap-0.5">
              <div className="mb-1 flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="size-3.5 text-primary" />
              </div>
              <span className="font-heading text-2xl font-bold tabular-nums">
                {uniqueLevels}
              </span>
              <span className="text-xs text-muted-foreground">Levels</span>
            </div>
          </div>*/}
        </div>
      </section>

      {/* ── Problems table ─────────────────────────────────────────────── */}
      <section id="problems" className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <PublicTable problems={problems} />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary">
              <Moon className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-sm font-semibold">Lunar CS</span>
          </div>

          {/* Tagline */}
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            UIL Computer Science Programming Problem Viewer
          </p>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lunar CS
          </p>
        </div>
      </footer>
    </div>
  );
}
