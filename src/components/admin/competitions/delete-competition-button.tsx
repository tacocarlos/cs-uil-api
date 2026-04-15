"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCompetition } from "@/server/actions/competitions";

interface DeleteCompetitionButtonProps {
  competitionId: number;
  /** Human-readable label shown in the dialog, e.g. "2025 District" */
  label: string;
  /** Total problem count shown in the warning */
  problemCount: number;
  /**
   * If provided, router.push(redirectTo) is called after a successful
   * deletion. Useful when the current page shows only this competition
   * (e.g. the edit page). Omit when the component lives in a list so the
   * page can just refresh in place.
   */
  redirectTo?: string;
  /**
   * "icon"  → ghost icon-sm button (for table rows)
   * "full"  → full-width destructive button (for the edit form Actions card)
   */
  variant?: "icon" | "full";
}

export function DeleteCompetitionButton({
  competitionId,
  label,
  problemCount,
  redirectTo,
  variant = "icon",
}: DeleteCompetitionButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(): void {
    startTransition(async () => {
      const result = await deleteCompetition(competitionId);
      if (result.success) {
        toast.success(`"${label}" deleted.`);
        setOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Trigger */}
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${label}`}
          className="text-muted-foreground/50 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      ) : (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          <Trash2 />
          Delete Competition
        </Button>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete competition?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{label}</strong> and all{" "}
              <strong className="text-foreground">
                {problemCount} problem{problemCount !== 1 ? "s" : ""}
              </strong>{" "}
              will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? "Deleting…" : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
