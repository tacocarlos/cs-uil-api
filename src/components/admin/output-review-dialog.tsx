"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { GeneratedOutputKind } from "@/server/judge0/generate";
import type { OutputOverwriteProposal } from "@/server/actions/outputs";
import {
  applyProblemOutputs,
  discardGeneratedOutputs,
} from "@/server/actions/outputs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const KIND_LABELS: Record<GeneratedOutputKind, string> = {
  test: "Test output",
  student: "Student output",
};

export interface OutputReviewSummary {
  accepted: number;
  denied: number;
  /** Proposals left undecided because the dialog was closed early. */
  skipped: number;
  /** Accepted proposals whose write failed. */
  failed: number;
}

interface OutputReviewDialogProps {
  /** Reviewed in order. Mount a fresh instance per batch. */
  proposals: OutputOverwriteProposal[];
  onFinished: (summary: OutputReviewSummary) => void;
}

/**
 * Steps through bulk-regenerated outputs one at a time so every overwrite is
 * an explicit decision. Accepting writes that single output immediately;
 * closing the dialog leaves the remaining proposals untouched.
 */
export function OutputReviewDialog({
  proposals,
  onFinished,
}: OutputReviewDialogProps) {
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<OutputReviewSummary>({
    accepted: 0,
    denied: 0,
    skipped: 0,
    failed: 0,
  });
  const [isApplying, startApplying] = useTransition();

  const total = proposals.length;
  const current = proposals[index];

  const advance = (next: OutputReviewSummary) => {
    if (index + 1 >= total) {
      onFinished(next);
    } else {
      setTally(next);
      setIndex(index + 1);
    }
  };

  const handleDeny = () => {
    if (current) void discardGeneratedOutputs([current.outputRef]);
    advance({ ...tally, denied: tally.denied + 1 });
  };

  const handleAccept = () => {
    if (!current) return;
    startApplying(async () => {
      // `output` is only a preview; the ref carries the full text.
      const result = await applyProblemOutputs(
        current.problemId,
        current.kind === "test"
          ? { test: current.outputRef }
          : { student: current.outputRef },
      );
      if (!result.success) {
        toast.error(`#${current.number} ${current.name}: ${result.error}`);
        void discardGeneratedOutputs([current.outputRef]);
        advance({ ...tally, failed: tally.failed + 1 });
        return;
      }
      advance({ ...tally, accepted: tally.accepted + 1 });
    });
  };

  const handleClose = () => {
    if (isApplying) return;
    // Proposals never reviewed: drop their uploaded outputs.
    void discardGeneratedOutputs(proposals.slice(index).map((p) => p.outputRef));
    onFinished({ ...tally, skipped: total - index });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        {current ? (
          <>
            <DialogHeader>
              <DialogTitle>
                #{current.number} {current.name} —{" "}
                {KIND_LABELS[current.kind]}
              </DialogTitle>
              <DialogDescription>
                Change {index + 1} of {total}. Accepting overwrites the stored
                output with the solution's output and resets this problem to
                unverified.
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Currently stored
                </span>
                <pre className="max-h-[50vh] overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3 font-mono text-[11px] whitespace-pre-wrap">
                  {current.existing.length > 0 ? current.existing : "(empty)"}
                </pre>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Solution output
                </span>
                <pre className="max-h-[50vh] overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3 font-mono text-[11px] whitespace-pre-wrap">
                  {current.output.length > 0 ? current.output : "(empty)"}
                </pre>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeny}
                disabled={isApplying}
              >
                <X />
                Deny
              </Button>
              <Button
                variant="destructive"
                onClick={handleAccept}
                disabled={isApplying}
              >
                {isApplying ? <Loader2 className="animate-spin" /> : <Check />}
                Accept overwrite
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
