"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GroupBy = "none" | "status" | "epic";

interface TaskFiltersProps {
  status: string;
  groupBy: GroupBy;
  onStatusChange: (value: string) => void;
  onGroupByChange: (value: GroupBy) => void;
}

export function TaskFilters({
  status,
  groupBy,
  onStatusChange,
  onGroupByChange,
}: TaskFiltersProps) {
  return (
    <div className="flex gap-2">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Grouping</SelectItem>
          <SelectItem value="status">Group by Status</SelectItem>
          <SelectItem value="epic">Group by Epic</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
