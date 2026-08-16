"use client";

import type React from "react";
import { useMemo, useState, useEffect, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  FileText,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  needsIntervention,
  VerificationBadge,
  verificationDescription,
} from "@/components/admin/verification-badge";
import { generateDraftOutputs } from "@/server/actions/outputs";
import { verifyDraftProblem } from "@/server/actions/verification";
import type {
  GeneratedOutputKind,
  GenerateOutputsResult,
} from "@/server/judge0/generate";
import type { VerificationOutcome } from "@/server/judge0/types";
import { parseCompileErrorLine } from "@/server/judge0/language";
import { CodeEditor } from "@/components/admin/code-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { MarkdownPreview } from "./markdown-preview";
import type { EditableProblem } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftState {
  name: string;
  markdown: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
  solution: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function caseKindLabel(kind: VerificationOutcome["cases"][number]["kind"]) {
  return kind === "test" ? "Judge test data" : "Student sample data";
}

/** Which draft field a generated output would overwrite. */
function generatedFieldLabel(kind: GeneratedOutputKind) {
  return kind === "test" ? "Test Expected Output" : "Student Expected Output";
}

interface ProblemEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem: EditableProblem | null;
  /** 0-based index in the problems array */
  problemIndex: number;
  totalProblems: number;
  onSave: (index: number, updated: EditableProblem) => void;
  onNavigate: (direction: "prev" | "next") => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProblemEditorSheet({
  open,
  onOpenChange,
  problem,
  problemIndex,
  totalProblems,
  onSave,
  onNavigate,
}: ProblemEditorSheetProps): React.JSX.Element {
  const [draft, setDraft] = useState<DraftState>({
    name: "",
    markdown: "",
    studentData: "",
    studentOutput: "",
    testData: "",
    testOutput: "",
    solution: "",
  });

  /** Latest verification outcome shown in the Verification tab. */
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(
    problem?.verification ?? null,
  );
  const [isVerifying, startVerifying] = useTransition();

  /** Latest generated-output run shown alongside the verification report. */
  const [generated, setGenerated] = useState<GenerateOutputsResult | null>(
    null,
  );
  const [isGenerating, startGenerating] = useTransition();

  // Reset draft whenever the selected problem changes (identified by number).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (problem) {
      setDraft({
        name: problem.name,
        markdown: problem.markdown,
        studentData: problem.studentData,
        studentOutput: problem.studentOutput,
        testData: problem.testData,
        testOutput: problem.testOutput,
        solution: problem.solution,
      });
      setOutcome(problem.verification ?? null);
      setGenerated(null);
    }
  }, [problem?.number]);

  function handleSave(): void {
    if (!problem) return;
    onSave(problemIndex, {
      ...problem,
      ...draft,
      verification: outcome ?? undefined,
      isDirty: true,
    });
    toast.success(`Problem ${problem.number} updated.`);
    onOpenChange(false);
  }

  /**
   * Verifies the CURRENT draft values (no save required) so the admin can fix
   * extracted data and immediately re-check it.
   */
  function handleVerify(): void {
    if (!problem) return;
    const current = problem;

    startVerifying(async () => {
      const result = await verifyDraftProblem({
        solution: draft.solution,
        studentData: draft.studentData,
        studentOutput: draft.studentOutput,
        testData: draft.testData,
        testOutput: draft.testOutput,
        problemName: draft.name,
        // The number is not editable in the draft, so read it from the problem.
        problemNumber: problem?.number,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setOutcome(result.outcome);

      // Propagate the result (and the draft it was produced from) upward so the
      // review list reflects the new status right away.
      onSave(problemIndex, {
        ...current,
        ...draft,
        verification: result.outcome,
        isDirty: true,
      });

      const { status, message } = result.outcome;
      const description = message.split("\n")[0] ?? undefined;

      if (status === "passed") {
        toast.success("Solution output matched the expected output.", {
          description,
        });
      } else if (status === "skipped") {
        toast.warning("Nothing to check for this problem.", { description });
      } else {
        toast.error(
          status === "failed"
            ? "Output mismatch — this problem needs review."
            : "Verification errored — this problem needs review.",
          { description },
        );
      }
    });
  }

  /**
   * Runs the reference solution on the CURRENT draft input data and reports
   * what it actually printed. Nothing is written anywhere until the admin picks
   * an output below — this is the inverse of verification: it trusts the
   * solution (verbatim from the competition ZIP) over the OCR'd expected output.
   */
  function handleGenerate(): void {
    if (!problem) return;

    startGenerating(async () => {
      const result = await generateDraftOutputs({
        solution: draft.solution,
        studentData: draft.studentData,
        testData: draft.testData,
        studentOutput: draft.studentOutput,
        testOutput: draft.testOutput,
        problemName: draft.name,
        // The number is not editable in the draft, so read it from the problem.
        problemNumber: problem?.number,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setGenerated(result.result);

      const produced = result.result.outputs.filter((o) => o.status === "ok");
      const differing = produced.filter((o) => o.differs);

      if (produced.length === 0) {
        toast.warning("The solution did not produce any usable output.", {
          description: result.result.outputs[0]?.message,
        });
      } else if (differing.length === 0) {
        toast.success("Solution output already matches the expected output.");
      } else {
        toast.info(
          `${differing.length} ${
            differing.length === 1 ? "output differs" : "outputs differ"
          } from the extracted value — review and apply below.`,
        );
      }
    });
  }

  /**
   * Copies generated output(s) into the draft. The Test Data tab's textareas are
   * bound to the same draft state, so they update immediately.
   */
  function applyGenerated(kinds: GeneratedOutputKind[]): void {
    if (!problem || !generated) return;

    const patch: Partial<DraftState> = {};
    const applied: string[] = [];

    for (const kind of kinds) {
      const entry = generated.outputs.find((o) => o.kind === kind);
      if (!entry || entry.status !== "ok" || entry.output === undefined) {
        continue;
      }
      if (kind === "test") patch.testOutput = entry.output;
      else patch.studentOutput = entry.output;
      applied.push(generatedFieldLabel(kind));
    }

    if (applied.length === 0) return;

    const updated = { ...draft, ...patch };
    setDraft(updated);

    // Same propagation contract as every other edit in this sheet.
    onSave(problemIndex, {
      ...problem,
      ...updated,
      verification: outcome ?? undefined,
      isDirty: true,
    });

    toast.success(
      `Replaced ${applied.join(" and ")} with the solution's output.`,
    );
  }

  const generatedOk =
    generated?.outputs.filter((o) => o.status === "ok") ?? [];
  const canApplyBoth = generatedOk.length > 1;

  /**
   * Line to flag in the editor. `prepareSource` only renames identifiers and
   * blanks lines in place, so Judge0's reported line number maps directly onto
   * the source shown here.
   */
  const compileErrorLine = useMemo(() => {
    const candidates = [
      ...(outcome?.cases ?? []).map((c) => c.stderr),
      ...(generated?.outputs ?? []).map((o) => o.stderr),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const line = parseCompileErrorLine(candidate);
      if (line !== null) return line;
    }
    return null;
  }, [outcome, generated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Override the default DialogContent sizing/layout entirely:
        - w-[90vw] max-w-[90vw]  → 90 % of the viewport width
        - h-[90vh]               → 90 % of the viewport height
        - flex flex-col gap-0 p-0 → own internal layout, no default padding/gap
        showCloseButton={false}  → we provide our own close button in the header
      */}
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] w-[95vw] max-w-[95vw] sm:max-w-[95vw] flex-col gap-0 overflow-hidden p-0"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-row items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
              #{problem?.number}
            </span>
            {/* DialogTitle is required for a11y — keeps the modal labelled */}
            <DialogTitle className="min-w-0 truncate font-heading text-base font-medium">
              {draft.name || "Untitled"}
            </DialogTitle>
            <span className="shrink-0">
              <VerificationBadge status={outcome?.status} />
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Previous problem */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onNavigate("prev")}
              disabled={problemIndex === 0}
              aria-label="Previous problem"
            >
              <ChevronLeft />
            </Button>

            <span className="text-xs text-muted-foreground tabular-nums">
              {problemIndex + 1} / {totalProblems}
            </span>

            {/* Next problem */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onNavigate("next")}
              disabled={problemIndex === totalProblems - 1}
              aria-label="Next problem"
            >
              <ChevronRight />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Close */}
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <Tabs
            defaultValue="problem"
            className="flex flex-1 flex-col gap-0 min-h-0"
          >
            {/* Tab bar — fixed above the scroll area */}
            <TabsList
              variant="line"
              className="w-full justify-start rounded-none border-b border-border/60 px-6"
            >
              <TabsTrigger value="problem">
                <FileText className="size-3.5" />
                Problem
              </TabsTrigger>
              <TabsTrigger value="testdata">
                <Database className="size-3.5" />
                Test Data
              </TabsTrigger>
              <TabsTrigger value="solution">
                <Code2 className="size-3.5" />
                Solution
              </TabsTrigger>
              <TabsTrigger value="verification">
                <ShieldCheck className="size-3.5" />
                Verification
              </TabsTrigger>
            </TabsList>

            {/* ── Problem tab ────────────────────────────────────────── */}
            <TabsContent
              value="problem"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <Label>Problem Name</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </div>

                  <Separator className="my-4" />

                  {/* Problem statement — split pane */}
                  <Label>Problem Statement</Label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    {/* Left: raw markdown */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Markdown Source
                      </Label>
                      <Textarea
                        value={draft.markdown}
                        onChange={(e) =>
                          setDraft({ ...draft, markdown: e.target.value })
                        }
                        className="min-h-125 font-mono text-xs"
                      />
                    </div>

                    {/* Right: rendered preview */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Preview
                      </Label>
                      <div className="min-h-125 overflow-y-auto rounded-2xl border border-border/60 bg-muted/10 p-4">
                        <MarkdownPreview content={draft.markdown} />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Test Data tab ───────────────────────────────────────── */}
            <TabsContent
              value="testdata"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Student sample column */}
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-semibold">Student Sample</p>
                      <Label>Student Input</Label>
                      <Textarea
                        value={draft.studentData}
                        onChange={(e) =>
                          setDraft({ ...draft, studentData: e.target.value })
                        }
                        className="min-h-70 font-mono text-xs"
                      />
                      <Label>Student Expected Output</Label>
                      <Textarea
                        value={draft.studentOutput}
                        onChange={(e) =>
                          setDraft({ ...draft, studentOutput: e.target.value })
                        }
                        className="min-h-50 font-mono text-xs"
                      />
                    </div>

                    {/* Judge / full test column */}
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-semibold">Judge / Full Test</p>
                      <Label>Test Input</Label>
                      <Textarea
                        value={draft.testData}
                        onChange={(e) =>
                          setDraft({ ...draft, testData: e.target.value })
                        }
                        className="min-h-70 font-mono text-xs"
                      />
                      <Label>Test Expected Output</Label>
                      <Textarea
                        value={draft.testOutput}
                        onChange={(e) =>
                          setDraft({ ...draft, testOutput: e.target.value })
                        }
                        className="min-h-50 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Solution tab ────────────────────────────────────────── */}
            <TabsContent
              value="solution"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-6">
                  <div>
                    <Label>Solution Source Code</Label>
                    <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                      Reference solution (Java for UIL competitions).
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

                    {/*
                      Keyed by problem: the sheet stays mounted while the admin
                      pages between problems, so without this the editor would
                      carry over the previous document's undo history and
                      cursor position.
                    */}
                    <CodeEditor
                      key={problemIndex}
                      value={draft.solution}
                      onChange={(next) => setDraft({ ...draft, solution: next })}
                      errorLine={compileErrorLine}
                      minHeight="28rem"
                      placeholder="Reference solution source code…"
                      ariaLabel="Solution source code"
                    />
                  </div>
                  <Separator />

                  {/* ── Generate expected output ────────────────── */}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">
                      Generate Expected Output
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Runs the solution above and captures what it prints — the
                      inverse of the Verification tab, which instead trusts the
                      extracted output. That output was read out of the PDF by
                      an AI, while this solution came verbatim from the
                      competition ZIP, so regenerating is often the right fix
                      for a mismatch.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Wand2 />
                            Generate Output
                          </>
                        )}
                      </Button>
                      {canApplyBoth ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => applyGenerated(["test", "student"])}
                          disabled={isGenerating}
                        >
                          <ArrowDownToLine />
                          Use both
                        </Button>
                      ) : null}
                      {generated?.languageName ? (
                        <span className="text-xs text-muted-foreground">
                          {generated.languageName}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isGenerating
                        ? "Compiling and running on Judge0 — this can take 10–40 seconds."
                        : "Runs the solution against the input data currently in this editor (10–40 seconds). Nothing is replaced until you apply an output below."}
                    </p>
                  </div>

                  {generated ? (
                    <>
                      {/* Source rewrites / data notes */}
                      {generated.notes.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                          {generated.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      ) : null}

                      {/* Per-kind preview */}
                      <ul className="flex flex-col gap-2">
                        {generated.outputs.map((o) => (
                          <li
                            key={o.kind}
                            className={cn(
                              "flex flex-col gap-1.5 rounded-2xl border p-3",
                              o.status === "error"
                                ? "border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5"
                                : "border-border/60 bg-muted/20",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {caseKindLabel(o.kind)}
                              </span>
                              {o.status === "ok" ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    o.differs
                                      ? "border-amber-500/40 text-amber-700 dark:border-amber-400/40 dark:text-amber-300"
                                      : "border-emerald-500/40 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-400",
                                  )}
                                >
                                  {o.differs
                                    ? "Differs from current"
                                    : "Identical to current"}
                                </Badge>
                              ) : null}
                            </div>

                            <p
                              className={cn(
                                "text-xs",
                                o.status === "error"
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-muted-foreground",
                              )}
                            >
                              {o.message}
                            </p>

                            {o.status === "error" && o.stderr ? (
                              <pre className="max-h-48 overflow-auto rounded-xl border border-amber-500/25 bg-amber-500/5 p-2 font-mono text-[11px] whitespace-pre-wrap dark:border-amber-400/25 dark:bg-amber-400/5">
                                {o.stderr}
                              </pre>
                            ) : null}

                            {o.status === "ok" ? (
                              <>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Program output
                                  </Label>
                                  <pre className="max-h-48 overflow-auto rounded-xl border border-border/60 bg-muted/30 p-2 font-mono text-[11px] whitespace-pre-wrap">
                                    {o.output}
                                  </pre>
                                </div>

                                {o.differs ? (
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Current value
                                    </Label>
                                    <pre className="max-h-48 overflow-auto rounded-xl border border-border/60 bg-muted/30 p-2 font-mono text-[11px] whitespace-pre-wrap">
                                      {o.existing}
                                    </pre>
                                  </div>
                                ) : null}

                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => applyGenerated([o.kind])}
                                    disabled={isGenerating}
                                  >
                                    <ArrowDownToLine />
                                    Use this output
                                  </Button>
                                  <span className="text-[11px] text-muted-foreground">
                                    Replaces {generatedFieldLabel(o.kind)}
                                    {o.time || o.memory !== undefined
                                      ? " · "
                                      : null}
                                    {o.time ? `${o.time}s` : null}
                                    {o.time && o.memory !== undefined
                                      ? " · "
                                      : null}
                                    {o.memory !== undefined
                                      ? `${o.memory} KB`
                                      : null}
                                  </span>
                                </div>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>

                      <p className="text-xs text-muted-foreground">
                        Once the expected output comes from the solution itself,
                        Run Check on the Verification tab can no longer disagree
                        with it — it will pass trivially.
                      </p>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Verification tab ────────────────────────────────────── */}
            <TabsContent
              value="verification"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="flex max-w-3xl flex-col gap-4 p-6">
                  {/* Run check */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerify}
                        disabled={isVerifying}
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
                      <VerificationBadge status={outcome?.status} />
                      {outcome?.languageName ? (
                        <span className="text-xs text-muted-foreground">
                          {outcome.languageName}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isVerifying
                        ? "Compiling and running on Judge0 — this can take 10–40 seconds."
                        : "Runs the solution and test data currently in this editor on Judge0 (10–40 seconds). No need to apply changes first."}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {verificationDescription(outcome?.status)}
                  </p>

                  {outcome ? (
                    <>
                      <Separator />

                      {/* Per-case breakdown */}
                      {outcome.cases.length > 0 ? (
                        <ul className="flex flex-col gap-2">
                          {outcome.cases.map((c, i) => (
                            <li
                              key={`${c.kind}-${i}`}
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
                                  {c.time && c.memory !== undefined
                                    ? " · "
                                    : null}
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
                      {outcome.message ? (
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Full report
                          </Label>
                          <pre className="max-h-80 overflow-auto rounded-2xl border border-border/60 bg-muted/20 p-3 font-mono text-[11px] whitespace-pre-wrap">
                            {outcome.message}
                          </pre>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-row items-center justify-between border-t border-border/60 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Changes are applied to the competition editor and saved when you
            save the competition.
          </p>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Discard
              </Button>
            </DialogClose>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" />
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
