import { Trophy, Pencil, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompetitionLevelBadge } from "@/components/problems/competition-level-badge";
import { ProblemStatusBadge } from "@/components/admin/problem-status-badge";
import { UploadCompetitionDialog } from "@/components/admin/upload-competition-dialog";
import { getCompetitionsWithCounts } from "@/server/actions/competitions";

export default async function CompetitionsPage() {
  const competitions = await getCompetitionsWithCounts();

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Competitions</h1>
          <p className="text-sm text-muted-foreground">
            Manage competition packets and their problems.
          </p>
        </div>
        <UploadCompetitionDialog />
      </div>

      {/* Competitions table card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" />
              <CardTitle>All Competitions</CardTitle>
            </div>
            <Badge variant="secondary">
              {competitions.length} competition{competitions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <CardDescription>
            Click Edit to modify competition settings or toggle individual problems.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {competitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
              <Trophy className="mx-auto mb-3 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No competitions yet. Use Upload Competition to add one.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Year</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Problems</TableHead>
                    <TableHead className="text-right">Enabled</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitions.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-heading font-semibold tabular-nums">
                        {comp.year}
                      </TableCell>
                      <TableCell>
                        <CompetitionLevelBadge level={comp.level} short />
                      </TableCell>
                      <TableCell>
                        <ProblemStatusBadge enabled={comp.enabled} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {comp.totalProblems}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {comp.enabledProblems}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comp.createdAt ? format(comp.createdAt, "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link href={`/admin/competitions/edit/${comp.id}`}>
                              <Pencil />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          {/* View public page — only when enabled */}
                          {comp.enabled && (
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link href={`/competitions/${comp.id}`} target="_blank">
                                <ExternalLink />
                                <span className="sr-only">View</span>
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
