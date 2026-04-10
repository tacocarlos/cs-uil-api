"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRight,
  ChevronLeft,
  FileText,
  Plus,
} from "lucide-react";

import { useUploadThing } from "@/lib/uploadthing";
import { FileUploadZone } from "@/components/admin/file-upload-zone";
import type { UploadedFileInfo, UploadStatus } from "@/components/admin/file-upload-zone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "upload" | "confirm";

interface UploadedFile extends UploadedFileInfo {
  url: string;
  key: string;
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload Files" },
  { id: "confirm", label: "Confirm" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2" aria-label="Dialog progress">
      {STEPS.map((step, index) => {
        const isPast = index < currentIndex;
        const isActive = step.id === current;

        return (
          <span key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  isPast ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                isActive
                  ? "font-medium text-foreground"
                  : isPast
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isPast
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border",
                )}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UploadStep — step 1
// ---------------------------------------------------------------------------

interface UploadStepProps {
  dataFile: UploadedFile | null;
  pdfFile: UploadedFile | null;
  onDataUploaded: (file: UploadedFile) => void;
  onPdfUploaded: (file: UploadedFile) => void;
  onDataRemoved: () => void;
  onPdfRemoved: () => void;
  onNext: () => void;
}

function UploadStep({
  dataFile,
  pdfFile,
  onDataUploaded,
  onPdfUploaded,
  onDataRemoved,
  onPdfRemoved,
  onNext,
}: UploadStepProps) {
  // ── Data ZIP upload ───────────────────────────────────────────────────────
  const [dataStatus, setDataStatus] = useState<UploadStatus>(
    dataFile ? "complete" : "idle",
  );
  const [dataProgress, setDataProgress] = useState(0);
  const [dataError, setDataError] = useState<string | null>(null);
  const [pendingDataFile, setPendingDataFile] = useState<UploadedFileInfo | null>(
    dataFile,
  );

  const { startUpload: startDataUpload, isUploading: isUploadingData } =
    useUploadThing("dataUploader", {
      onUploadProgress: (p) => setDataProgress(p),
      onClientUploadComplete: ([res]) => {
        if (!res) return;
        const uploaded: UploadedFile = {
          name: res.name,
          size: res.size,
          url: res.ufsUrl,
          key: res.key,
        };
        setDataStatus("complete");
        onDataUploaded(uploaded);
      },
      onUploadError: (err) => {
        setDataStatus("error");
        setDataError(err.message);
      },
    });

  const handleDataFileSelected = useCallback(
    async (file: File) => {
      setDataStatus("uploading");
      setDataProgress(0);
      setDataError(null);
      setPendingDataFile({ name: file.name, size: file.size });
      await startDataUpload([file]);
    },
    [startDataUpload],
  );

  const handleDataRemoved = useCallback(() => {
    setDataStatus("idle");
    setDataProgress(0);
    setDataError(null);
    setPendingDataFile(null);
    onDataRemoved();
  }, [onDataRemoved]);

  // ── Student PDF upload ────────────────────────────────────────────────────
  const [pdfStatus, setPdfStatus] = useState<UploadStatus>(
    pdfFile ? "complete" : "idle",
  );
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<UploadedFileInfo | null>(
    pdfFile,
  );

  const { startUpload: startPdfUpload, isUploading: isUploadingPdf } =
    useUploadThing("pdfUploader", {
      onUploadProgress: (p) => setPdfProgress(p),
      onClientUploadComplete: ([res]) => {
        if (!res) return;
        const uploaded: UploadedFile = {
          name: res.name,
          size: res.size,
          url: res.ufsUrl,
          key: res.key,
        };
        setPdfStatus("complete");
        onPdfUploaded(uploaded);
      },
      onUploadError: (err) => {
        setPdfStatus("error");
        setPdfError(err.message);
      },
    });

  const handlePdfFileSelected = useCallback(
    async (file: File) => {
      setPdfStatus("uploading");
      setPdfProgress(0);
      setPdfError(null);
      setPendingPdfFile({ name: file.name, size: file.size });
      await startPdfUpload([file]);
    },
    [startPdfUpload],
  );

  const handlePdfRemoved = useCallback(() => {
    setPdfStatus("idle");
    setPdfProgress(0);
    setPdfError(null);
    setPendingPdfFile(null);
    onPdfRemoved();
  }, [onPdfRemoved]);

  // ── render ────────────────────────────────────────────────────────────────
  const canProceed = dataFile !== null && pdfFile !== null;
  const isUploading = isUploadingData || isUploadingPdf;

  return (
    <>
      <DialogHeader>
        <StepIndicator current="upload" />
        <DialogTitle>Upload Competition</DialogTitle>
        <DialogDescription>
          Upload the data archive and student packet to begin processing. Both
          files are required before continuing.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        {/* Data ZIP */}
        <FileUploadZone
          label="Data ZIP File"
          description="Competition data archive"
          hint=".zip up to 512 MB"
          accept=".zip,application/zip,application/x-zip-compressed"
          icon={<Archive className="size-5" />}
          status={dataStatus}
          progress={dataProgress}
          uploadedFile={pendingDataFile}
          error={dataError}
          disabled={isUploadingData || isUploadingPdf}
          onFileSelected={handleDataFileSelected}
          onRemove={handleDataRemoved}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">and</span>
          <Separator className="flex-1" />
        </div>

        {/* Student Packet PDF */}
        <FileUploadZone
          label="Student Problem Packet"
          description="PDF of competition problems"
          hint=".pdf up to 4 MB"
          accept=".pdf,application/pdf"
          icon={<FileText className="size-5" />}
          status={pdfStatus}
          progress={pdfProgress}
          uploadedFile={pendingPdfFile}
          error={pdfError}
          disabled={isUploadingData || isUploadingPdf}
          onFileSelected={handlePdfFileSelected}
          onRemove={handlePdfRemoved}
        />
      </div>

      <DialogFooter>
        <Button
          onClick={onNext}
          disabled={!canProceed || isUploading}
          className="w-full sm:w-auto"
        >
          Continue
          <ArrowRight />
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// ConfirmStep — step 2
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

interface ConfirmStepProps {
  dataFile: UploadedFile;
  pdfFile: UploadedFile;
  onBack: () => void;
  onConfirm: () => void;
}

function ConfirmStep({ dataFile, pdfFile, onBack, onConfirm }: ConfirmStepProps) {
  return (
    <>
      <DialogHeader>
        <StepIndicator current="confirm" />
        <DialogTitle>Confirm Upload</DialogTitle>
        <DialogDescription>
          Review the files below, then proceed to the competition editor where
          you can verify and adjust the extracted data.
        </DialogDescription>
      </DialogHeader>

      {/* File summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/60 overflow-hidden">
        {/* Data ZIP row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Archive className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{dataFile.name}</p>
            <p className="text-xs text-muted-foreground">
              Data archive · {formatBytes(dataFile.size)}
            </p>
          </div>
        </div>

        {/* Student Packet row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{pdfFile.name}</p>
            <p className="text-xs text-muted-foreground">
              Student packet · {formatBytes(pdfFile.size)}
            </p>
          </div>
        </div>
      </div>

      {/* Info note */}
      <p className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        The competition editor will let you review and adjust the level, year,
        and individual problems extracted from these files before saving.
      </p>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onBack} type="button">
          <ChevronLeft />
          Back
        </Button>
        <Button onClick={onConfirm} type="button">
          Proceed to Editor
          <ArrowRight />
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// UploadCompetitionDialog — root
// ---------------------------------------------------------------------------

export function UploadCompetitionDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [dataFile, setDataFile] = useState<UploadedFile | null>(null);
  const [pdfFile, setPdfFile] = useState<UploadedFile | null>(null);

  // Reset all state whenever the dialog closes.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("upload");
      setDataFile(null);
      setPdfFile(null);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!dataFile || !pdfFile) return;
    const params = new URLSearchParams({
      dataKey: dataFile.key,
      dataUrl: dataFile.url,
      pdfKey: pdfFile.key,
      pdfUrl: pdfFile.url,
    });
    router.push(`/admin/competitions/add?${params.toString()}`);
    setOpen(false);
  }, [dataFile, pdfFile, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Upload Competition
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" showCloseButton={step === "upload"}>
        {step === "upload" ? (
          <UploadStep
            dataFile={dataFile}
            pdfFile={pdfFile}
            onDataUploaded={setDataFile}
            onPdfUploaded={setPdfFile}
            onDataRemoved={() => setDataFile(null)}
            onPdfRemoved={() => setPdfFile(null)}
            onNext={() => setStep("confirm")}
          />
        ) : (
          <ConfirmStep
            dataFile={dataFile!}
            pdfFile={pdfFile!}
            onBack={() => setStep("upload")}
            onConfirm={handleConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
