import { BookOpen, CheckCircle2, Trophy, XCircle } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProblemStats = {
  total: number;
  enabled: number;
  disabled: number;
  byLevel: Record<string, number>;
};

type StatCardProps = {
  title: string;
  description: string;
  value: number;
  icon: React.ReactNode;
  iconContainerClassName?: string;
};

function StatCard({
  title,
  description,
  value,
  icon,
  iconContainerClassName,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              iconContainerClassName,
            )}
          >
            {icon}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-bold text-3xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function ProblemsStats({ stats }: { stats: ProblemStats }) {
  const uniqueLevels = Object.keys(stats.byLevel).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="Total Problems"
        description="Across all competitions"
        value={stats.total}
        icon={<BookOpen className="size-5 text-muted-foreground" />}
        iconContainerClassName="bg-muted"
      />
      <StatCard
        title="Active Problems"
        description="Currently enabled"
        value={stats.enabled}
        icon={<CheckCircle2 className="size-5 text-green-600 dark:text-green-500" />}
        iconContainerClassName="bg-green-100 dark:bg-green-950"
      />
      <StatCard
        title="Inactive Problems"
        description="Currently disabled"
        value={stats.disabled}
        icon={<XCircle className="size-5 text-destructive" />}
        iconContainerClassName="bg-destructive/10 dark:bg-destructive/20"
      />
      <StatCard
        title="Competition Levels"
        description="Unique levels with problems"
        value={uniqueLevels}
        icon={<Trophy className="size-5 text-muted-foreground" />}
        iconContainerClassName="bg-muted"
      />
    </div>
  );
}
