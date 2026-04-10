import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";

import type { User } from "@/server/better-auth/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// FieldRow
// ---------------------------------------------------------------------------

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UserInfoCard
// ---------------------------------------------------------------------------

interface UserInfoCardProps {
  user: User;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  const initials = getInitials(user.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Avatar + identity row */}
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name} />
            )}
            <AvatarFallback className="text-base font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-heading truncate text-lg font-semibold leading-tight">
              {user.name}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        <Separator />

        {/* Field list */}
        <div className="divide-y divide-border/60">
          <FieldRow label="Display name" value={user.name} />

          <FieldRow
            label="Email address"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="truncate">{user.email}</span>
                {user.emailVerified ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-muted-foreground/50" />
                )}
              </span>
            }
          />

          <FieldRow
            label="Role"
            value={
              <Badge
                variant={user.role === "admin" ? "default" : "secondary"}
                className="capitalize"
              >
                {user.role}
              </Badge>
            }
          />

          <FieldRow
            label="Member since"
            value={format(new Date(user.createdAt), "MMMM d, yyyy")}
          />

          <FieldRow
            label="User ID"
            value={
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {user.id}
              </code>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
