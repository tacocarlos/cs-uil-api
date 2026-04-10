import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { eq, asc } from "drizzle-orm";

import { getProblemById } from "@/server/actions/problems";
import { db } from "@/server/db";
import { problem as problemTable } from "@/server/db/schemas/core-schema";
import { SiteNavbar } from "@/components/site/site-navbar";
import { MarkdownPreview } from "@/components/admin/competition/markdown-preview";
import { CompetitionLevelBadge } from "@/components/problems/competition-level-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    notFound();
  }

  const problem = await getProblemById(numId);

  if (!problem || !problem.enabled || !problem.competitionEnabled) {
    notFound();
  }

  // Fetch sibling problems ordered by number for prev/next navigation.
  const siblings = await db
    .select({
      id: problemTable.id,
      number: problemTable.number,
      name: problemTable.name,
    })
    .from(problemTable)
    .where(eq(problemTable.competition, problem.competitionId))
    .orderBy(asc(problemTable.number));

  const currentIdx = siblings.findIndex((s) => s.id === problem.id);
  const prevProblem = currentIdx > 0 ? siblings[currentIdx - 1] : undefined;
  const nextProblem =
    currentIdx !== -1 && currentIdx < siblings.length - 1
      ? siblings[currentIdx + 1]
      : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

          {/* Back link */}
          <Link
            href="/#problems"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All Problems
          </Link>

          {/* Problem header */}
          <div className="mb-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                #{problem.number}
              </span>
              <CompetitionLevelBadge level={problem.competitionLevel} short />
              <Badge variant="secondary">{problem.competitionYear}</Badge>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              {problem.name}
            </h1>
          </div>

          {/* Markdown body */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <MarkdownPreview content={problem.markdown} />
            </CardContent>
          </Card>

          {/* Sample I/O — only shown when studentData is non-empty */}
          {problem.studentData.trim() && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Sample I/O</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Input
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {problem.studentData}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Expected Output
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {problem.studentOutput}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between">
            {prevProblem ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/problems/${prevProblem.id}`}>
                  <ChevronLeft /> Problem {prevProblem.number}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {nextProblem ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/problems/${nextProblem.id}`}>
                  Problem {nextProblem.number} <ChevronRight />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
