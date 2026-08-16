"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code2,
  ConeIcon,
  Database,
  FileText,
  Loader2,
  PlayCircle,
  Replace,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import {
  applyProblemOutputs,
  generateProblemOutputs,
} from "@/server/actions/outputs";
import {
  deleteProblem,
  updateProblem,
  type ProblemDetail,
} from "@/server/actions/problems";
import { verifyProblemById } from "@/server/actions/verification";
import type {
  GeneratedOutputKind,
  GenerateOutputsResult,
} from "@/server/judge0/generate";
import type { VerificationOutcome } from "@/server/judge0/types";
import { parseCompileErrorLine } from "@/server/judge0/language";
import { CodeEditor } from "@/components/admin/code-editor";
import {
  needsIntervention,
  VerificationBadge,
  verificationDescription,
  verificationLabel,
} from "@/components/admin/verification-badge";
import { MarkdownPreview } from "@/components/admin/competition/markdown-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProblemEditFormProps {
  problem: ProblemDetail;
}

/** Which generated outputs the admin has ticked for overwriting. */
type OutputSelection = Record<GeneratedOutputKind, boolean>;

interface DraftState {
  name: string;
  number: number;
  markdown: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  solution: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCheckedAt(value: Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function caseKindLabel(kind: VerificationOutcome["cases"][number]["kind"]) {
  return kind === "test" ? "Judge test data" : "Student sample data";
}

function outputKindLabel(kind: GeneratedOutputKind) {
  return kind === "test" ? "Judge test data" : "Student sample data";
}

function formatKindList(kinds: GeneratedOutputKind[]): string {
  const labels = kinds.map(outputKindLabel);
  if (labels.length <= 1) return labels[0] ?? "nothing";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Pre-tick only the kinds that actually changed — there is nothing to gain from
 * rewriting an output that already matches.
 */
function defaultSelection(result: GenerateOutputsResult): OutputSelection {
  const selection: OutputSelection = { student: false, test: false };
  for (const output of result.outputs) {
    selection[output.kind] = output.status === "ok" && output.differs === true;
  }
  return selection;
}

// ---------------------------------------------------------------------------
// ProblemEditForm
// ---------------------------------------------------------------------------

export function ProblemEditForm({ problem }: ProblemEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifying] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [isApplying, startApplying] = useTransition();

  /** Freshly-returned outcome from the most recent "Run Check" in this session. */
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  /** Freshly-returned preview from the most recent "Generate" in this session. */
  const [generated, setGenerated] = useState<GenerateOutputsResult | null>(
    null,
  );
  const [selection, setSelection] = useState<OutputSelection>({
    student: false,
    test: false,
  });

  const [draft, setDraft] = useState<DraftState>({
    name: problem.name,
    number: problem.number,
    markdown: problem.markdown ?? "",
    studentData: problem.studentData ?? "",
    studentOutput: problem.studentOutput ?? "",
    testData: problem.testData ?? "",
    testOutput: problem.testOutput ?? "",
    solution: problem.solution ?? "",
    enabled: problem.enabled ?? false,
  });

  function setField<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateProblem(problem.id, draft);
      if (result.success) {
        toast.success("Problem saved successfully.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleVerify() {
    startVerifying(async () => {
      const result = await verifyProblemById(problem.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setOutcome(result.outcome);
      setReportOpen(true);

      const { status, message } = result.outcome;
      const summary = message.split("\n")[0] ?? undefined;

      if (status === "passed") {
        toast.success("Solution output matched the expected output.", {
          description: summary,
        });
      } else if (status === "skipped") {
        toast.warning("Nothing to check for this problem.", {
          description: summary,
        });
      } else {
        toast.error(
          status === "failed"
            ? "Output mismatch — this problem needs review."
            : "Verification errored — this problem needs review.",
          { description: summary },
        );
      }

      router.refresh();
    });
  }

  function handleGenerate() {
    startGenerating(async () => {
      const result = await generateProblemOutputs(problem.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setGenerated(result.result);
      setSelection(defaultSelection(result.result));

      const produced = result.result.outputs.filter((o) => o.status === "ok");
      const changed = produced.filter((o) => o.differs === true);

      if (produced.length === 0) {
        toast.warning("The solution did not produce any output to capture.", {
          description: result.result.outputs[0]?.message,
        });
      } else if (changed.length === 0) {
        toast.success("Generated output matches what is already stored.");
      } else {
        toast.warning(
          `Generated output differs from the stored output for ${formatKindList(
            changed.map((o) => o.kind),
          )}.`,
          { description: "Review the preview before overwriting." },
        );
      }
    });
  }

  function handleApply() {
    const payload: { student?: string; test?: string } = {};
    for (const output of generated?.outputs ?? []) {
      if (output.status !== "ok" || output.output === undefined) continue;
      if (!selection[output.kind]) continue;
      payload[output.kind] = output.output;
    }

    if (payload.student === undefined && payload.test === undefined) return;

    startApplying(async () => {
      const result = await applyProblemOutputs(problem.id, payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Keep the editor in sync so a later save does not revert the overwrite.
      setDraft((prev) => ({
        ...prev,
        ...(payload.student !== undefined
          ? { studentOutput: payload.student }
          : {}),
        ...(payload.test !== undefined ? { testOutput: payload.test } : {}),
      }));

      setGenerated(null);
      setSelection({ student: false, test: false });
      setOutcome(null);

      toast.success(
        `Overwrote the expected output for ${formatKindList(result.applied)}.`,
        {
          description:
            "Verification was reset to unverified — the solution now defines its own expected output.",
        },
      );

      router.refresh();
    });
  }

  // ── Derived verification state ────────────────────────────────────────────

  const verificationStatus = outcome?.status ?? problem.verificationStatus;
  const report = outcome?.message ?? problem.verificationMessage;
  const checkedAt = formatCheckedAt(problem.verifiedAt);
  const requiresReview = needsIntervention(verificationStatus);

  // ── Derived generation state ──────────────────────────────────────────────

  /** Any in-flight transition blocks every action to avoid racing a refresh. */
  const busy = isPending || isVerifying || isGenerating || isApplying;

  const selectedKinds =
    generated?.outputs
      .filter((o) => o.status === "ok" && selection[o.kind])
      .map((o) => o.kind) ?? [];

  /**
   * Line to flag in the editor.
   *
   * Judge0 reports diagnostics against the source it compiled. `prepareSource`
   * only renames identifiers and blanks lines in place, so the reported number
   * maps directly onto the source shown here. Prefers a fresh verification run,
   * then a generation run, then the persisted report.
   */
  const compileErrorLine = useMemo(() => {
    const candidates = [
      ...(outcome?.cases ?? []).map((c) => c.stderr),
      ...(generated?.outputs ?? []).map((o) => o.stderr),
      outcome ? undefined : (problem.verificationMessage ?? undefined),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const line = parseCompileErrorLine(candidate);
      if (line !== null) return line;
    }
    return null;
  }, [outcome, generated, problem.verificationMessage]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Left column ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        {/* Card 1 — Problem Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-muted-foreground" />
              <CardTitle>Problem Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="problem-name">Name</Label>
              <Input
                id="problem-name"
                value={draft.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Problem Number */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="problem-number">Problem Number</Label>
              <Input
                id="problem-number"
                type="number"
                value={draft.number}
                onChange={(e) =>
                  setField("number", parseInt(e.target.value, 10))
                }
                disabled={isPending}
              />
            </div>

            <Separator />

            {/* Enabled toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Make visible to students
                </p>
              </div>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(v) => setField("enabled", v)}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Solution Verification */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <CardTitle>Solution Verification</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Current status */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <VerificationBadge status={verificationStatus} />
                {outcome?.languageName ? (
                  <span className="text-xs text-muted-foreground">
                    {outcome.languageName}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {verificationDescription(verificationStatus)}
              </p>
              {checkedAt ? (
                <p className="text-xs text-muted-foreground">
                  Last checked {checkedAt}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Never checked against the judge.
                </p>
              )}
            </div>

            {/* Needs-review callout */}
            {requiresReview ? (
              <div className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Needs human review
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    This problem reported{" "}
                    <span className="font-medium">
                      {verificationLabel(verificationStatus)}
                    </span>
                    . Review the report below and fix the solution or test data
                    before enabling it for students.
                  </p>
                </div>
              </div>
            ) : null}

            <Separator />

            {/* Run check */}
            <div className="flex flex-col gap-1.5">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleVerify}
                disabled={busy}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <PlayCircle />
                    Run Check
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {isVerifying
                  ? "Compiling and running on Judge0 — this can take 10–40 seconds."
                  : "Runs the saved solution on Judge0 (10–40 seconds). Save first to check unsaved edits."}
              </p>
            </div>

            {/* Report */}
            {report ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {reportOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  {reportOpen ? "Hide report" : "Show report"}
                </button>

                {reportOpen ? (
                  <div className="flex flex-col gap-3">
                    {/* Per-case summary (only for a fresh run) */}
                    {outcome && outcome.cases.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {outcome.cases.map((c) => (
                          <li
                            key={c.kind}
                            className={cn(
                              "flex flex-col gap-1.5 rounded-2xl border p-3",
                              needsIntervention(c.status)
                                ? "border-red-500/25 bg-red-500/5 dark:border-red-400/25 dark:bg-red-400/5"
                                : "border-border/60 bg-muted/20",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {caseKindLabel(c.kind)}
                              </span>
                              <VerificationBadge status={c.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {c.message}
                            </p>
                            {c.mismatchLine !== undefined ? (
                              <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                                <span className="text-muted-foreground">
                                  First mismatch on line {c.mismatchLine}
                                </span>
                                <span className="break-all">
                                  <span className="text-muted-foreground">
                                    expected:{" "}
                                  </span>
                                  {JSON.stringify(c.expectedLine ?? null)}
                                </span>
                                <span className="break-all">
                                  <span className="text-muted-foreground">
                                    actual:{" "}
                                  </span>
                                  {JSON.stringify(c.actualLine ?? null)}
                                </span>
                              </div>
                            ) : null}
                            {c.time || c.memory !== undefined ? (
                              <p className="text-[11px] text-muted-foreground">
                                {c.time ? `${c.time}s` : null}
                                {c.time && c.memory !== undefined ? " · " : null}
                                {c.memory !== undefined
                                  ? `${c.memory} KB`
                                  : null}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {/* Raw report */}
                    <pre className="max-h-80 overflow-auto rounded-2xl border border-border/60 bg-muted/20 p-3 font-mono text-[11px] whitespace-pre-wrap">
                      {report}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Card 3 — Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={busy}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save />
                  Save Problem
                </>
              )}
            </Button>
            <Button
              className="w-full bg-secondary text-foreground"
              onClick={async () => {
                // TODO: make this an "actual" (non-browser) dialog confirmation
                const confirmation = confirm(
                  "Are you sure you want to delete this problem?",
                );
                if (confirmation === false) {
                  return;
                }
                const status = await deleteProblem(problem.id);
                if (status.success === false) {
                  toast.error("Failed to delete problem.");
                } else {
                  router.push("/admin/problems");
                }
              }}
            >
              Delete Problem
            </Button>
            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <Link href="/admin/problems">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="statement">
              {/* Tab list */}
              <TabsList variant="line" className="mb-6 w-full justify-start">
                <TabsTrigger value="statement">
                  <FileText className="size-4" />
                  Problem Statement
                </TabsTrigger>
                <TabsTrigger value="testdata">
                  <Database className="size-4" />
                  Test Data
                </TabsTrigger>
                <TabsTrigger value="solution">
                  <Code2 className="size-4" />
                  Solution
                </TabsTrigger>
              </TabsList>

              {/* ── Statement tab ───────────────────────────────────────── */}
              <TabsContent value="statement">
                <Label>Problem Statement</Label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  {/* Editor */}
                  <Textarea
                    value={draft.markdown}
                    onChange={(e) => setField("markdown", e.target.value)}
                    className="min-h-125 font-mono text-xs"
                    disabled={isPending}
                  />
                  {/* Preview */}
                  <div className="min-h-125 overflow-y-auto rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <MarkdownPreview content={draft.markdown} />
                  </div>
                </div>
              </TabsContent>

              {/* ── Test Data tab ────────────────────────────────────────── */}
              <TabsContent value="testdata">
                <div className="grid grid-cols-2 gap-6">
                  {/* Student Sample */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Student Input</Label>
                      <Textarea
                        value={draft.studentData}
                        onChange={(e) =>
                          setField("studentData", e.target.value)
                        }
                        className="min-h-70 font-mono text-xs"
                        disabled={isPending}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Student Expected Output</Label>
                      <Textarea
                        value={draft.studentOutput}
                        onChange={(e) =>
                          setField("studentOutput", e.target.value)
                        }
                        className="min-h-50 font-mono text-xs"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  {/* Judge / Full Test */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Test Input</Label>
                      <Textarea
                        value={draft.testData}
                        onChange={(e) => setField("testData", e.target.value)}
                        className="min-h-70 font-mono text-xs"
                        disabled={isPending}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Test Expected Output</Label>
                      <Textarea
                        value={draft.testOutput}
                        onChange={(e) => setField("testOutput", e.target.value)}
                        className="min-h-50 font-mono text-xs"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Solution tab ─────────────────────────────────────────── */}
              <TabsContent value="solution">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <Label>Solution Source Code</Label>
                    <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
                      Reference solution (Java for UIL).
                    </p>

                    {compileErrorLine !== null ? (
                      <div className="mb-2 flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                        <p className="text-xs text-destructive">
                          Judge0 reported a problem on{" "}
                          <strong>line {compileErrorLine}</strong> — highlighted
                          below.
                        </p>
                      </div>
                    ) : null}

                    <CodeEditor
                      value={draft.solution}
                      onChange={(next) => setField("solution", next)}
                      readOnly={isPending}
                      errorLine={compileErrorLine}
                      minHeight="32rem"
                      placeholder="Reference solution source code…"
                      ariaLabel="Solution source code"
                    />
                  </div>

                  <Separator />

                  {/* ── Generate Expected Output ─────────────────────────── */}
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">
                        Generate Expected Output
                      </h3>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Runs the saved solution above on the stored input and
                      captures whatever it prints. Overwriting replaces the
                      stored expected output with the program&apos;s own output —
                      handy when the expected output was OCR&apos;d from a PDF
                      but the solution came verbatim from the contest archive.
                    </p>

                    {/* Generate */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={busy}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Wand2 />
                            Generate
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {isGenerating
                          ? "Compiling and running on Judge0 — this can take 10–40 seconds."
                          : "Runs the saved solution on Judge0 (10–40 seconds). Nothing is written until you overwrite."}
                      </p>
                    </div>

                    {/* Preview */}
                    {generated ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">Preview</span>
                          <span className="text-xs text-muted-foreground">
                            {generated.languageName}
                          </span>
                        </div>

                        {generated.notes.length > 0 ? (
                          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                            {generated.notes.map((note) => (
                              <li key={note}>{note}</li>
                            ))}
                          </ul>
                        ) : null}

                        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {generated.outputs.map((output) => (
                            <li
                              key={output.kind}
                              className={cn(
                                "flex flex-col gap-2 rounded-2xl border p-3",
                                output.status === "error"
                                  ? "border-amber-500/25 bg-amber-500/5 dark:border-amber-400/25 dark:bg-amber-400/5"
                                  : "border-border/60 bg-muted/20",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium">
                                  {outputKindLabel(output.kind)}
                                </span>
                                {output.status === "ok" ? (
                                  output.differs ? (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-500/40 text-amber-700 dark:border-amber-400/40 dark:text-amber-300"
                                    >
                                      differs from stored output
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      identical to stored output
                                    </Badge>
                                  )
                                ) : null}
                              </div>

                              <p
                                className={cn(
                                  "text-xs",
                                  output.status === "error"
                                    ? "text-amber-700 dark:text-amber-300"
                                    : "text-muted-foreground",
                                )}
                              >
                                {output.message}
                              </p>

                              {output.status === "error" && output.stderr ? (
                                <pre className="max-h-48 overflow-auto rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 font-mono text-[11px] whitespace-pre-wrap dark:border-amber-400/25 dark:bg-amber-400/5">
                                  {output.stderr}
                                </pre>
                              ) : null}

                              {output.status === "ok" ? (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      Solution output
                                    </span>
                                    <pre className="max-h-48 overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3 font-mono text-[11px] whitespace-pre-wrap">
                                      {output.output}
                                    </pre>
                                  </div>

                                  {output.differs ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[11px] font-medium text-muted-foreground">
                                        Currently stored
                                      </span>
                                      <pre className="max-h-48 overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3 font-mono text-[11px] whitespace-pre-wrap">
                                        {output.existing.length > 0
                                          ? output.existing
                                          : "(empty)"}
                                      </pre>
                                    </div>
                                  ) : null}

                                  {output.time ||
                                  output.memory !== undefined ? (
                                    <p className="text-[11px] text-muted-foreground">
                                      {output.time ? `${output.time}s` : null}
                                      {output.time &&
                                      output.memory !== undefined
                                        ? " · "
                                        : null}
                                      {output.memory !== undefined
                                        ? `${output.memory} KB`
                                        : null}
                                    </p>
                                  ) : null}

                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`overwrite-${output.kind}`}
                                      checked={selection[output.kind]}
                                      onCheckedChange={(checked) =>
                                        setSelection((prev) => ({
                                          ...prev,
                                          [output.kind]: checked === true,
                                        }))
                                      }
                                      disabled={busy}
                                    />
                                    <Label
                                      htmlFor={`overwrite-${output.kind}`}
                                      className="text-xs font-normal text-muted-foreground"
                                    >
                                      Overwrite this expected output
                                    </Label>
                                  </div>
                                </>
                              ) : null}
                            </li>
                          ))}
                        </ul>

                        {/* Overwrite */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              className="w-fit"
                              disabled={busy || selectedKinds.length === 0}
                            >
                              {isApplying ? (
                                <>
                                  <Loader2 className="animate-spin" />
                                  Overwriting…
                                </>
                              ) : (
                                <>
                                  <Replace />
                                  Overwrite Selected
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogMedia className="bg-amber-500/10">
                                <AlertTriangle className="text-amber-600 dark:text-amber-400" />
                              </AlertDialogMedia>
                              <AlertDialogTitle>
                                Overwrite expected output?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This replaces the stored expected output for{" "}
                                <strong className="text-foreground">
                                  {formatKindList(selectedKinds)}
                                </strong>{" "}
                                with the solution&apos;s own output. Verification
                                can then no longer independently disagree with
                                the solution — the next check will trivially
                                pass. Only do this when you trust the solution
                                more than the stored output. The problem is also
                                reset to{" "}
                                <strong className="text-foreground">
                                  unverified
                                </strong>
                                .
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleApply}>
                                Overwrite expected output
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : null}
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
