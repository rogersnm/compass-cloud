"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PriorityBadge } from "./priority-badge";
import type { Task } from "@/lib/api/types";

interface KanbanCardProps {
  task: Task;
  epicBreadcrumb: string | null;
  onClick: () => void;
  overlay?: boolean;
}

export function KanbanCard({ task, epicBreadcrumb, onClick, overlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (overlay) {
    return (
      <div className="rounded-md border bg-card p-3 shadow-lg">
        <CardContent task={task} epicBreadcrumb={epicBreadcrumb} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <CardContent task={task} epicBreadcrumb={epicBreadcrumb} />
    </div>
  );
}

function CardContent({ task, epicBreadcrumb }: { task: Task; epicBreadcrumb: string | null }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="mt-1 text-sm font-medium line-clamp-2">{task.title}</p>
      {epicBreadcrumb && (
        <p className="mt-1 text-xs text-muted-foreground truncate">{epicBreadcrumb}</p>
      )}
    </>
  );
}
