"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  COMPETITION_LEVELS,
  LEVEL_LABELS,
  type CompetitionFormState,
} from "./types";

interface CompetitionDetailsFormProps {
  form: CompetitionFormState;
  onChange: (updates: Partial<CompetitionFormState>) => void;
}

export function CompetitionDetailsForm({
  form,
  onChange,
}: CompetitionDetailsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Year */}
      <div className="flex flex-col gap-1.5">
        <Label>Year</Label>
        <Input
          type="number"
          placeholder="e.g. 2024"
          min={2000}
          max={2099}
          value={form.year}
          onChange={(e) => onChange({ year: e.target.value })}
        />
      </div>

      {/* Level */}
      <div className="flex flex-col gap-1.5">
        <Label>Level</Label>
        <Select
          value={form.level === "" ? `unknown` : form.level}
          onValueChange={(v) => onChange({ level: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPETITION_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {LEVEL_LABELS[level] ?? level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          checked={form.enabled}
          onCheckedChange={(v) => onChange({ enabled: v })}
        />
      </div>

      <Separator />

      {/* Student Packet URL */}
      <div className="flex flex-col gap-1.5">
        <Label>Student Packet URL</Label>
        <Input
          value={form.studentPacketUrl}
          readOnly
          className="cursor-default truncate font-mono text-xs"
        />
      </div>

      {/* Data ZIP URL */}
      <div className="flex flex-col gap-1.5">
        <Label>Data ZIP URL</Label>
        <Input
          value={form.dataZipUrl}
          readOnly
          className="cursor-default truncate font-mono text-xs"
        />
      </div>
    </div>
  );
}
