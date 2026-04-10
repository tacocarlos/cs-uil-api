import type React from "react";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ExtractionLoader } from "@/components/admin/competition/extraction-loader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{
    dataKey?: string;
    dataUrl?: string;
    pdfKey?: string;
    pdfUrl?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AddCompetitionPage({
  searchParams,
}: PageProps): Promise<React.JSX.Element> {
  const { dataUrl, pdfUrl } = await searchParams;

  // ── Missing files ─────────────────────────────────────────────────────────
  if (!dataUrl || !pdfUrl) {
    return (
      <div className="space-y-6">
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
              Review and adjust extracted data before saving.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Uploaded files not found</p>
            <p className="mt-0.5 text-destructive/80">
              This page expects{" "}
              <code className="font-mono text-xs">dataUrl</code> and{" "}
              <code className="font-mono text-xs">pdfUrl</code> search
              parameters. Return to the{" "}
              <Link href="/admin/problems" className="underline">
                Problems page
              </Link>{" "}
              and upload files using the dialog.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Extraction + editor ───────────────────────────────────────────────────
  return <ExtractionLoader dataUrl={dataUrl} pdfUrl={pdfUrl} />;
}
