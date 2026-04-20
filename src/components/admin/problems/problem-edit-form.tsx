"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  ConeIcon,
  Database,
  FileText,
  Loader2,
  Save,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteProblem,
  updateProblem,
  type ProblemDetail,
} from "@/server/actions/problems";
import { MarkdownPreview } from "@/components/admin/competition/markdown-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProblemEditFormProps {
  problem: ProblemDetail;
}

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
// ProblemEditForm
// ---------------------------------------------------------------------------

export function ProblemEditForm({ problem }: ProblemEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

        {/* Card 2 — Actions */}
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
                <div className="flex flex-col gap-1.5">
                  <Label>Solution Source Code</Label>
                  <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
                    Reference solution (Java for UIL).
                  </p>
                  <Textarea
                    value={draft.solution}
                    onChange={(e) => setField("solution", e.target.value)}
                    className="min-h-150 font-mono text-xs"
                    disabled={isPending}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
