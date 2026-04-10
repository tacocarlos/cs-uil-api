"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ExtractionResult } from "@/server/extraction/types";

import { CompetitionEditor } from "./competition-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractionLoaderProps {
  dataUrl: string;
  pdfUrl: string;
}

type SseEvent =
  | { type: "progress"; message: string; percent: number }
  | { type: "complete"; result: ExtractionResult }
  | { type: "error"; message: string };

type Stage =
  | { status: "connecting" }
  | { status: "extracting"; message: string; percent: number }
  | { status: "done"; result: ExtractionResult }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "download", label: "Download files",       doneAt: 29 },
  { id: "ai",       label: "AI analyses PDF",       doneAt: 75 },
  { id: "images",   label: "Upload images",         doneAt: 88 },
  { id: "assemble", label: "Assemble competition",  doneAt: 96 },
] as const;

// ---------------------------------------------------------------------------
// ExtractionLoader
// ---------------------------------------------------------------------------

export function ExtractionLoader({
  dataUrl,
  pdfUrl,
}: ExtractionLoaderProps): React.JSX.Element {
  const [stage, setStage] = useState<Stage>({ status: "connecting" });
  const [elapsed, setElapsed] = useState(0);

  // ── SSE connection ────────────────────────────────────────────────────────
  useEffect(() => {
    const url = `/api/extract?dataUrl=${encodeURIComponent(dataUrl)}&pdfUrl=${encodeURIComponent(pdfUrl)}`;
    const source = new EventSource(url);

    source.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as SseEvent;
      if (event.type === "progress") {
        setStage({ status: "extracting", message: event.message, percent: event.percent });
      } else if (event.type === "complete") {
        setStage({ status: "done", result: event.result });
        source.close();
      } else if (event.type === "error") {
        setStage({ status: "error", message: event.message });
        source.close();
      }
    };

    source.onerror = () => {
      setStage({ status: "error", message: "Connection to extraction service failed." });
      source.close();
    };

    return () => source.close();
  }, [dataUrl, pdfUrl]);

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage.status !== "connecting" && stage.status !== "extracting") return;

    const id = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [stage.status]);

  // ── Derived values ────────────────────────────────────────────────────────
  const currentPercent = stage.status === "extracting" ? stage.percent : 0;

  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = elapsed % 60;
  const elapsedDisplay = `${String(elapsedMinutes)}:${String(elapsedSeconds).padStart(2, "0")}`;

  // ── Render — done ─────────────────────────────────────────────────────────
  if (stage.status === "done") {
    return (
      <CompetitionEditor
        initialData={stage.result}
        dataUrl={dataUrl}
        pdfUrl={pdfUrl}
      />
    );
  }

  // ── Render — error ────────────────────────────────────────────────────────
  if (stage.status === "error") {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
              <XCircle className="size-6 text-destructive" />
            </div>
            <CardTitle>Extraction Failed</CardTitle>
            <CardDescription>{stage.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/problems">← Back to Problems</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render — connecting / extracting ─────────────────────────────────────
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
            <div>
              <CardTitle>Extracting Competition Data</CardTitle>
              <CardDescription>
                {stage.status === "connecting"
                  ? "Connecting to extraction service…"
                  : stage.message}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentPercent}%</span>
              <span>{elapsedDisplay}</span>
            </div>
            <Progress value={currentPercent} className="h-2" />
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const isDone = currentPercent > step.doneAt;
              const isActive =
                !isDone && STEPS.slice(0, i).every((s) => currentPercent > s.doneAt);
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    isDone && "text-foreground",
                    isActive && "text-foreground font-medium",
                    !isDone && !isActive && "text-muted-foreground/40",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                  ) : isActive ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Circle className="size-4 shrink-0" />
                  )}
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* Note about AI duration */}
          <p className="text-xs text-muted-foreground border-t border-border/60 pt-4">
            Claude is reading the student packet and extracting each problem as structured
            markdown. This typically takes 30–90 seconds depending on packet length.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
