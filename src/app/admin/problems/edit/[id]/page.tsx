import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getProblemById } from "@/server/actions/problems";
import { ProblemEditForm } from "@/components/admin/problems/problem-edit-form";
import { ProblemStatusBadge } from "@/components/admin/problem-status-badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProblemEditPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (Number.isNaN(numId)) {
    notFound();
  }

  const p = await getProblemById(numId);

  if (!p) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          asChild
          className="shrink-0"
        >
          <Link href="/admin/problems">
            <ArrowLeft />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight truncate">
              {p.name}
            </h1>
            <ProblemStatusBadge enabled={p.enabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            Problem #{p.number} · {p.competitionYear}{" "}
            {p.competitionLevel ?? ""}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="shrink-0"
        >
          <Link href={`/problems/${p.id}`} target="_blank">
            <ExternalLink className="size-3.5" /> View
          </Link>
        </Button>
      </div>

      {/* Edit form */}
      <ProblemEditForm problem={p} />
    </div>
  );
}
