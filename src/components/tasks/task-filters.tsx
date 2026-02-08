"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  status: string;
  type: string;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function TaskFilters({
  status,
  type,
  onStatusChange,
  onTypeChange,
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
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="task">Task</SelectItem>
          <SelectItem value="epic">Epic</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
