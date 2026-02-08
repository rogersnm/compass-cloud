import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
