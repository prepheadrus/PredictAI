import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative";
  description?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              changeType === "positive" && "text-green-600",
              changeType === "negative" && "text-red-600"
            )}
          >
            {change} {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
