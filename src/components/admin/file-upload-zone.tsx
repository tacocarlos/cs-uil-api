"use client";

import { useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadStatus = "idle" | "uploading" | "complete" | "error";

export interface UploadedFileInfo {
  name: string;
  size: number;
}

export interface FileUploadZoneProps {
  /** Visible label shown in the idle state (e.g. "Data ZIP File") */
  label: string;
  /** Short description shown below the label (e.g. "Competition data archive") */
  description: string;
  /** Small hint shown next to the upload icon (e.g. ".zip up to 512 MB") */
  hint: string;
  /** Native <input accept="…"> value (e.g. ".zip,application/zip") */
  accept: string;
  /** Icon rendered inside the coloured tile in the idle state */
  icon: React.ReactNode;
  /** Current upload lifecycle state */
  status: UploadStatus;
  /** Upload progress 0–100; only used while status === "uploading" */
  progress: number;
  /** Set once the upload completes successfully */
  uploadedFile: UploadedFileInfo | null;
  /** Error message; only shown while status === "error" */
  error: string | null;
  /** Prevents interaction while another upload is in-flight */
  disabled?: boolean;
  /** Called as soon as the user picks / drops a file */
  onFileSelected: (file: File) => void;
  /** Called when the user clicks the remove (×) button after a successful upload */
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// FileUploadZone
// ---------------------------------------------------------------------------

export function FileUploadZone({
  label,
  description,
  hint,
  accept,
  icon,
  status,
  progress,
  uploadedFile,
  error,
  disabled = false,
  onFileSelected,
  onRemove,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── file selection ────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
        // Reset so the same file can be reselected after removal.
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onFileSelected],
  );

  // ── drag-and-drop ─────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [disabled, onFileSelected],
  );

  // ── keyboard activation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [],
  );

  // ── uploading state ───────────────────────────────────────────────────────
  if (status === "uploading") {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {uploadedFile?.name ?? "Uploading…"}
            </p>
            <p className="text-xs text-muted-foreground">Uploading…</p>
          </div>
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {progress}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    );
  }

  // ── complete state ────────────────────────────────────────────────────────
  if (status === "complete" && uploadedFile) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(uploadedFile.size)} · Uploaded
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Remove file"
          type="button"
        >
          <X />
        </Button>
      </div>
    );
  }

  // ── idle / error state ────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden real file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Drag-and-drop target */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex cursor-pointer select-none flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging
            ? "border-primary/60 bg-primary/5"
            : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
          status === "error" && "border-destructive/40 bg-destructive/5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Icon tile */}
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>

        {/* Labels */}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {/* Hint row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Upload className="size-3" />
          <span>{hint}</span>
        </div>

        {/* Inline error */}
        {status === "error" && error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </>
  );
}
