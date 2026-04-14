"use client";

import type React from "react";
import { type ReactNode, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Save,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCompetition,
  saveProblem,
  type ProblemToSave,
} from "@/server/actions/save";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExtractionResult } from "@/server/extraction/types";

import { CompetitionDetailsForm } from "./competition-details-form";
import { ProblemEditorSheet } from "./problem-editor-sheet";
import { ProblemsReviewList } from "./problems-review-list";
import type { CompetitionFormState, EditableProblem } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitionEditorProps {
  initialData: ExtractionResult;
  dataUrl: string;
  pdfUrl: string;
}

// ---------------------------------------------------------------------------
// SourceFilePill — local sub-component
// ---------------------------------------------------------------------------

function SourceFilePill({
  icon,
  label,
  url,
}: {
  icon: ReactNode;
  label: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
        Uploaded
      </Badge>
    </a>
  );
}

// ---------------------------------------------------------------------------
// CompetitionEditor
// ---------------------------------------------------------------------------

export function CompetitionEditor({
  initialData,
  dataUrl,
  pdfUrl,
}: CompetitionEditorProps): React.JSX.Element {
  const [form, setForm] = useState<CompetitionFormState>({
    year: String(initialData.yearHint ?? ""),
    level: initialData.levelHint ?? "",
    enabled: false,
    studentPacketUrl: pdfUrl,
    dataZipUrl: dataUrl,
  });

  const [problems, setProblems] = useState<EditableProblem[]>(
    initialData.problems.map((p) => ({ ...p, isDirty: false })),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);

  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [saveProgress, setSaveProgress] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFormChange(updates: Partial<CompetitionFormState>): void {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function handleEditProblem(index: number): void {
    setEditingIndex(index);
    setSheetOpen(true);
  }

  function handleSaveProblem(index: number, updated: EditableProblem): void {
    setProblems((prev) => prev.map((p, i) => (i === index ? updated : p)));
  }

  function handleSave(): void {
    startSaving(async () => {
      // ── Phase 1: create the competition row (tiny payload) ──────────────
      setSaveProgress("Creating competition…");
      const compResult = await createCompetition(form);
      if (!compResult.success) {
        toast.error(compResult.error);
        setSaveProgress(null);
        return;
      }

      // ── Phase 2: save each problem individually (one request per problem)
      // This avoids hitting Vercel's 4.5 MB server-action payload limit that
      // would trigger if all problems were sent in a single request body.
      const { competitionId } = compResult;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i]!;
        setSaveProgress(`Saving problem ${i + 1} of ${problems.length}…`);

        const problemData: ProblemToSave = {
          name: p.name,
          number: p.number,
          markdown: p.markdown,
          studentData: p.studentData,
          studentOutput: p.studentOutput,
          testData: p.testData,
          testOutput: p.testOutput,
          solution: p.solution,
        };

        const probResult = await saveProblem(competitionId, problemData);
        if (!probResult.success) {
          toast.error(`Problem ${p.number}: ${probResult.error}`);
          setSaveProgress(null);
          return;
        }
      }

      setSaveProgress(null);
      toast.success("Competition saved successfully.");
      router.push("/admin/problems");
    });
  }

  function handleNavigate(direction: "prev" | "next"): void {
    setEditingIndex((prev) =>
      direction === "prev"
        ? Math.max(0, prev - 1)
        : Math.min(problems.length - 1, prev + 1),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Back button + title */}
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            asChild
            className="mt-0.5 shrink-0"
          >
            <Link href="/admin/problems">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Add Competition
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and adjust the extracted data before saving.
            </p>
          </div>
        </div>

        {/* Source file pills */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <SourceFilePill
            icon={<Archive className="size-3.5" />}
            label="Data ZIP"
            url={dataUrl}
          />
          <SourceFilePill
            icon={<FileText className="size-3.5" />}
            label="Student Packet"
            url={pdfUrl}
          />
        </div>
      </div>

      {/* ── Main 3-col layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Competition Details + Actions */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Competition Details card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-muted-foreground" />
                <CardTitle>Competition Details</CardTitle>
              </div>
              <CardDescription>
                Verify and adjust the metadata before saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompetitionDetailsForm form={form} onChange={handleFormChange} />
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
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {saveProgress ?? "Saving…"}
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
                disabled={isSaving}
                asChild
              >
                <Link href="/admin/problems">Cancel</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Extracted Problems */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-muted-foreground" />
                  <CardTitle>Extracted Problems</CardTitle>
                </div>
                <Badge variant="secondary">
                  {problems.length} problem{problems.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <CardDescription>
                Click <Pencil className="mx-0.5 inline size-3" /> to open the
                editor for any problem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {problems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No problems were extracted.
                  </p>
                </div>
              ) : (
                <ProblemsReviewList
                  problems={problems}
                  onEdit={handleEditProblem}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Problem editor sheet ─────────────────────────────────────────── */}
      <ProblemEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        problem={problems[editingIndex] ?? null}
        problemIndex={editingIndex}
        totalProblems={problems.length}
        onSave={handleSaveProblem}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
