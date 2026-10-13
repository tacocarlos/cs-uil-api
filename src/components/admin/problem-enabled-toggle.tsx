"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProblemEnabled } from "@/server/actions/competitions";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ProblemEnabledToggleProps {
  problemId: number;
  name: string;
  enabled: boolean | null;
}

/**
 * Inline active/inactive switch for the problems table. Flips immediately and
 * rolls back if the update fails.
 */
export function ProblemEnabledToggle({
  problemId,
  name,
  enabled,
}: ProblemEnabledToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(
    enabled === true,
  );

  const handleChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticEnabled(checked);
      const result = await updateProblemEnabled(problemId, checked);
      if (!result.success) {
        toast.error(`Could not update "${name}": ${result.error}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    // The row navigates on click; keep toggling from opening the editor.
    // biome-ignore lint/a11y/useKeyWithClickEvents: only stops propagation
    <label
      className="inline-flex cursor-pointer items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Switch
        size="sm"
        checked={optimisticEnabled}
        onCheckedChange={handleChange}
        disabled={isPending}
        aria-label={`${optimisticEnabled ? "Disable" : "Enable"} ${name}`}
      />
      <span
        className={cn(
          "text-sm",
          optimisticEnabled
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground",
        )}
      >
        {optimisticEnabled ? "Active" : "Inactive"}
      </span>
    </label>
  );
}
