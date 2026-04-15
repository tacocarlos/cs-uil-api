"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, Loader2, Pencil, Plus, Save, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LEVEL_LABELS } from "@/components/problems/competition-level-badge";
import { COMPETITION_LEVELS } from "@/components/admin/competition/types";
import { DeleteCompetitionButton } from "@/components/admin/competitions/delete-competition-button";
import {
  setAllProblemsEnabled,
  updateCompetition,
  updateProblemEnabled,
} from "@/server/actions/competitions";
import { createBlankProblem } from "@/server/actions/save";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  competition: {
    id: number;
    level: string | null;
    year: number;
    student_packet_url: string;
    data_zip_url: string;
    enabled: boolean | null;
  };
  problems: Array<{
    id: number;
    name: string;
    number: number;
    enabled: boolean | null;
  }>;
}

// ---------------------------------------------------------------------------
// CompetitionEditForm
// ---------------------------------------------------------------------------

export function CompetitionEditForm({ competition, problems }: Props) {
  const [form, setForm] = useState({
    level: competition.level ?? "custom",
    year: String(competition.year),
    enabled: competition.enabled ?? false,
  });

  const [problemEnabled, setProblemEnabled] = useState<Map<number, boolean>>(
    () => new Map(problems.map((p) => [p.id, p.enabled ?? false])),
  );

  const [isPending, startTransition] = useTransition();
  const [isPendingToggleAll, startToggleAllTransition] = useTransition();
  const [isPendingAdd, startAddTransition] = useTransition();
  const router = useRouter();

  const sortedProblems = [...problems].sort((a, b) => a.number - b.number);

  const allEnabled =
    problems.length > 0 &&
    problems.every((p) => problemEnabled.get(p.id) ?? false);

  function handleToggleAll(checked: boolean): void {
    // Optimistic update
    setProblemEnabled(new Map(problems.map((p) => [p.id, checked])));
    startToggleAllTransition(async () => {
      const result = await setAllProblemsEnabled(competition.id, checked);
      if (!result.success) {
        // Revert on failure
        setProblemEnabled(
          new Map(problems.map((p) => [p.id, p.enabled ?? false])),
        );
        toast.error(result.error);
      }
    });
  }

  function handleAddProblem(): void {
    startAddTransition(async () => {
      const nextNumber =
        sortedProblems.length > 0
          ? Math.max(...sortedProblems.map((p) => p.number)) + 1
          : 1;
      const result = await createBlankProblem(competition.id, nextNumber);
      if (result.success) {
        router.push(`/admin/problems/edit/${result.problemId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSave(): void {
    startTransition(async () => {
      const result = await updateCompetition(competition.id, {
        level: form.level,
        year: parseInt(form.year, 10),
        enabled: form.enabled,
      });
      if (result.success) {
        toast.success("Competition updated successfully.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Left column ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        {/* Competition Details card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" />
              <CardTitle>Competition Details</CardTitle>
            </div>
            <CardDescription>
              Update the competition metadata and visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Year */}
            <div className="flex flex-col gap-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: e.target.value }))
                }
              />
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1.5">
              <Label>Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPETITION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Enabled toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Make competition visible to students
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
            </div>

            <Separator />

            {/* Student Packet URL */}
            <div className="flex flex-col gap-1.5">
              <Label>Student Packet URL</Label>
              <Input
                value={competition.student_packet_url}
                readOnly
                className="cursor-default font-mono text-xs"
              />
            </div>

            {/* Data ZIP URL */}
            <div className="flex flex-col gap-1.5">
              <Label>Data ZIP URL</Label>
              <Input
                value={competition.data_zip_url}
                readOnly
                className="cursor-default font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save />
                  Save Competition
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <Link href="/admin/problems">Cancel</Link>
            </Button>
            <Separator />
            <DeleteCompetitionButton
              competitionId={competition.id}
              label={`${form.year} ${LEVEL_LABELS[form.level as keyof typeof LEVEL_LABELS] ?? form.level}`}
              problemCount={problems.length}
              redirectTo="/admin/competitions"
              variant="full"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Right column: Problems ────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-muted-foreground" />
                <CardTitle>Problems</CardTitle>
              </div>
              <Badge variant="secondary">
                {problems.length} problem{problems.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <CardDescription>
              Toggle visibility or open the editor for individual problems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Enable-all toggle */}
            <div className="mb-1 flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-medium text-muted-foreground">
                Enable all problems
              </span>
              <Switch
                size="sm"
                checked={allEnabled}
                onCheckedChange={handleToggleAll}
                disabled={isPendingToggleAll || problems.length === 0}
                aria-label="Enable or disable all problems"
              />
            </div>

            {sortedProblems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No problems in this competition.
                </p>
              </div>
            ) : (
              <div>
                {sortedProblems.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 border-b border-border/40 py-3 last:border-0"
                  >
                    <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {p.number}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <Switch
                      size="sm"
                      checked={problemEnabled.get(p.id) ?? false}
                      onCheckedChange={async (checked) => {
                        setProblemEnabled((m) => new Map(m).set(p.id, checked));
                        const result = await updateProblemEnabled(
                          p.id,
                          checked,
                        );
                        if (!result.success) {
                          setProblemEnabled((m) =>
                            new Map(m).set(p.id, !checked),
                          );
                          toast.error(result.error);
                        }
                      }}
                    />
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/admin/problems/edit/${p.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Problem button */}
            <button
              type="button"
              onClick={handleAddProblem}
              disabled={isPendingAdd}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {isPendingAdd ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isPendingAdd ? "Creating…" : "Add Problem"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
