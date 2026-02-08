import { Badge } from "@/components/ui/badge";

const priorityStyles: Record<number, string> = {
  0: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  1: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  3: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const priorityLabels: Record<number, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
  3: "P3",
};

export function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority === null || priority === undefined) return null;
  return (
    <Badge variant="outline" className={priorityStyles[priority]}>
      {priorityLabels[priority] ?? `P${priority}`}
    </Badge>
  );
}
