"use client";

import type React from "react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCompetition,
  saveProblem,
  type ProblemToSave,
} from "@/server/actions/save";
import { verifyDraftProblem } from "@/server/actions/verification";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExtractionResult } from "@/server/extraction/types";

import { CompetitionDetailsForm } from "./competition-details-form";
import { needsIntervention } from "@/components/admin/verification-badge";
import { ProblemEditorSheet } from "./problem-editor-sheet";
import { ProblemsReviewList } from "./problems-review-list";
import { draftDataRefs } from "./draft-refs";
import { cachedUploadUrl } from "@/lib/text-ref-client";
import type { CompetitionFormState, EditableProblem } from "./types";
import type { ExtractedProblem } from "@/server/extraction/types";

import { uploadFiles } from "@/app/api/uploadthing/client";

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

  const [problems, setProblems] = useState<EditableProblem[]>(() =>
    initialData.problems.map((p) => ({
      ...p,
      uid: crypto.randomUUID(),
      isDirty: false,
      enabled: false,
    })),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);

  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [saveProgress, setSaveProgress] = useState<string | null>(null);

  // ── Background verification ───────────────────────────────────────────────
  //
  // Extraction no longer waits on Judge0, so each solution is checked here
  // once the review screen is up, one at a time (server actions run
  // sequentially anyway). Results land on the matching problem as they arrive.

  /** Latest problems, readable from the async loop without re-running it. */
  const problemsRef = useRef(problems);
  problemsRef.current = problems;

  /** Set when saving starts or the editor unmounts; ends the loop early. */
  const stopVerifying = useRef(false);

  const [verifyProgress, setVerifyProgress] = useState<{
    uid: string;
    name: string;
    count: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    // Per-run flag: Strict Mode mounts effects twice in dev, and a shared ref
    // reset by the second run would let the first loop keep going too.
    let cancelled = false;
    const shouldStop = () => cancelled || stopVerifying.current;

    const queue = problemsRef.current
      .filter((p) => p.verification === undefined)
      .map((p) => p.uid);

    void (async () => {
      for (const [i, uid] of queue.entries()) {
        if (shouldStop()) break;

        // Read the problem fresh: it may have been edited, verified by hand
        // from the sheet, or removed since the queue was built.
        const target = problemsRef.current.find((p) => p.uid === uid);
        if (!target || target.verification !== undefined) continue;

        setVerifyProgress({
          uid,
          name: target.name || `Problem ${target.number}`,
          count: i + 1,
          total: queue.length,
        });

        let refs: Awaited<ReturnType<typeof draftDataRefs>>;
        try {
          refs = await draftDataRefs(target);
        } catch {
          continue;
        }
        if (shouldStop()) break;

        const result = await verifyDraftProblem({
          solution: target.solution,
          ...refs,
          problemName: target.name,
          problemNumber: target.number,
        });
        if (shouldStop()) break;
        if (!result.success) continue;

        setProblems((prev) =>
          prev.map((p) =>
            // Discard the result if the data it was computed from changed or
            // the admin already ran their own check.
            p.uid === uid &&
            p.verification === undefined &&
            p.solution === target.solution &&
            p.studentData === target.studentData &&
            p.studentOutput === target.studentOutput &&
            p.testData === target.testData &&
            p.testOutput === target.testOutput
              ? { ...p, verification: result.outcome }
              : p,
          ),
        );
      }
      if (!cancelled) setVerifyProgress(null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    // Saving queues behind any in-flight server action; stop verifying so the
    // save is not held up by the remaining Judge0 runs.
    stopVerifying.current = true;
    setVerifyProgress(null);

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
      // MUST upload things from the client side, since the alternative is not using Vercel and I don't want to mess with that rn
      const uploadText = async (
        pname: string,
        content: string,
        ext: "dat" | "out" | "md",
        type: "student" | "test" | "problem-text",
      ) => {
        // Large fields were usually uploaded already for verification or
        // fetched from a generated output — reuse that file.
        const cached = await cachedUploadUrl(content)?.catch(() => null);
        if (cached) return cached;

        const file = new File(
          [content],
          `${pname}-${parseInt(form.year) ?? new Date().getUTCFullYear()}-${type}.${ext}`,
          {
            type: ext === "md" ? "text/markdown" : "text/plain",
          },
        );

        const result = await uploadFiles("textUploader", {
          files: [file],
        });

        return result[0]?.ufsUrl ?? null;
      };

      const { competitionId } = compResult;
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i]!;
        setSaveProgress(`Saving problem ${i + 1} of ${problems.length}…`);

        const problemData: ProblemToSave = {
          name: p.name,
          number: p.number,
          solution: p.solution,
          enabled: p.enabled,
          problem_text_url: await uploadText(
            p.name,
            p.markdown,
            "md",
            "problem-text",
          ),
          student_data_url: await uploadText(
            p.name,
            p.studentData,
            "dat",
            "student",
          ),
          student_output_url: await uploadText(
            p.name,
            p.studentOutput,
            "out",
            "student",
          ),
          test_data_url: await uploadText(p.name, p.testData, "dat", "test"),
          // NOTE: previously uploaded `p.markdown` here, which stored the
          // problem statement as the expected judge output.
          test_output_url: await uploadText(
            p.name,
            p.testOutput,
            "out",
            "test",
          ),
          verification_status: p.verification?.status,
          verification_message: p.verification?.message ?? null,
          images: p.images,
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

  /**
   * Bulk enable/disable.
   *
   * Enabling never flips a problem whose solution failed verification — those
   * require a human to look at them first. Disabling always applies.
   */
  function handleToggleAll(enabled: boolean): void {
    if (!enabled) {
      setProblems((prev) => prev.map((p) => ({ ...p, enabled: false })));
      return;
    }

    const blocked = problems.filter((p) => needsIntervention(p.verification?.status));

    setProblems((prev) =>
      prev.map((p) =>
        needsIntervention(p.verification?.status) ? p : { ...p, enabled: true },
      ),
    );

    if (blocked.length > 0) {
      toast.warning(
        `${blocked.length} problem${blocked.length === 1 ? "" : "s"} left disabled — solution output did not match. Review ${
          blocked.length === 1 ? "it" : "them"
        } before enabling.`,
      );
    }
  }

  function handleRemoveProblem(index: number): void {
    setProblems((prev) =>
      prev
        .filter((_, i) => i !== index)
        // Re-number sequentially so there are no gaps
        .map((p, i) => ({ ...p, number: i + 1 })),
    );
  }

  function handleAddProblem(): void {
    const nextNumber =
      problems.length > 0 ? Math.max(...problems.map((p) => p.number)) + 1 : 1;

    const blank: EditableProblem = {
      uid: crypto.randomUUID(),
      number: nextNumber,
      name: "",
      markdown: "",
      studentData: "",
      studentOutput: "",
      testData: "",
      testOutput: "",
      solution: "",
      images: [],
      isDirty: true,
      enabled: false,
    };

    // problems.length is the 0-based index of the item that will be added
    const newIndex = problems.length;
    setProblems((prev) => [...prev, blank]);
    setEditingIndex(newIndex);
    setSheetOpen(true);
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
              {verifyProgress ? (
                <div className="mb-4 space-y-1.5 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                    <span className="truncate">
                      [{verifyProgress.count}/{verifyProgress.total}] Verifying{" "}
                      <span className="font-medium text-foreground">
                        {verifyProgress.name}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={
                      ((verifyProgress.count - 1) / verifyProgress.total) * 100
                    }
                    className="h-1.5"
                  />
                </div>
              ) : null}
              {problems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No problems were extracted.
                  </p>
                </div>
              ) : (
                <ProblemsReviewList
                  problems={problems}
                  verifyingUid={verifyProgress?.uid}
                  onEdit={handleEditProblem}
                  onRemove={handleRemoveProblem}
                  onToggleAll={handleToggleAll}
                />
              )}
              {/* Add Problem button */}
              <button
                type="button"
                onClick={handleAddProblem}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Plus className="size-4" />
                Add Problem
              </button>
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
