"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
    }
  }, [problem?.number]);

  function handleSave(): void {
    if (!problem) return;
    onSave(problemIndex, { ...problem, ...draft, isDirty: true });
    toast.success(`Problem ${problem.number} updated.`);
    onOpenChange(false);
  }

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
                <div className="p-6">
                  <Label>Solution Source Code</Label>
                  <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                    Reference solution (Java for UIL competitions).
                  </p>
                  <Textarea
                    value={draft.solution}
                    onChange={(e) =>
                      setDraft({ ...draft, solution: e.target.value })
                    }
                    className="min-h-150 font-mono text-xs"
                  />
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
