"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import type { Task } from "@/lib/api/types";

interface StatusSection {
  status: string;
  label: string;
  tasks: Task[];
}

interface StatusGroupViewProps {
  sections: StatusSection[];
  orgSlug: string;
  projectKey: string;
  hasNextPage: boolean;
  onLoadMore: () => void;
  isFetchingNextPage: boolean;
}

function DraggableTaskRow({
  task,
  orgSlug,
  projectKey,
}: {
  task: Task;
  orgSlug: string;
  projectKey: string;
}) {
  const router = useRouter();
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
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/${orgSlug}/projects/${projectKey}/tasks/${task.key}`)}
      className="flex items-center gap-3 px-3 py-2 border-b hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
        {task.key}
      </span>
      <span className="text-sm flex-1 truncate">
        {task.title}
        {task.type === "epic" && (
          <Badge variant="secondary" className="text-xs ml-2">epic</Badge>
        )}
      </span>
      <StatusBadge status={task.status} />
      <PriorityBadge priority={task.priority} />
    </div>
  );
}

function TaskRowOverlay({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-card border shadow-lg">
      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
        {task.key}
      </span>
      <span className="text-sm flex-1 truncate">{task.title}</span>
      <StatusBadge status={task.status} />
      <PriorityBadge priority={task.priority} />
    </div>
  );
}

function DroppableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[2px] rounded transition-colors ${isOver ? "bg-primary/10" : ""}`}
    >
      {children}
    </div>
  );
}

function StatusSectionView({
  section,
  orgSlug,
  projectKey,
}: {
  section: StatusSection;
  orgSlug: string;
  projectKey: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <DroppableSection id={`status:${section.status}`}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="text-sm font-semibold truncate">{section.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium ml-auto shrink-0">
            {section.tasks.length}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t pl-4">
          {section.tasks.map((task) => (
            <DraggableTaskRow key={task.key} task={task} orgSlug={orgSlug} projectKey={projectKey} />
          ))}
        </CollapsibleContent>
      </DroppableSection>
    </Collapsible>
  );
}

export function StatusGroupView({
  sections,
  orgSlug,
  projectKey,
  hasNextPage,
  onLoadMore,
  isFetchingNextPage,
}: StatusGroupViewProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const s of sections) {
      for (const t of s.tasks) m.set(t.key, t);
    }
    return m;
  }, [sections]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTask(taskMap.get(event.active.id as string) ?? null);
    },
    [taskMap]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskKey = active.id as string;
      const overId = over.id as string;

      // Parse target: "status:<value>" or a task key (find which section it's in)
      let targetStatus: string | null = null;
      if (overId.startsWith("status:")) {
        targetStatus = overId.replace("status:", "");
      } else {
        // Dropped on another task; find that task's status
        const overTask = taskMap.get(overId);
        if (overTask) targetStatus = overTask.status;
      }

      if (!targetStatus) return;

      const task = taskMap.get(taskKey);
      if (!task || task.status === targetStatus) return;

      // Optimistic update
      queryClient.setQueryData(
        ["tasks", projectKey],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: { data: Task[]; next_cursor: string | null }) => ({
              ...page,
              data: page.data.map((t: Task) =>
                t.key === taskKey ? { ...t, status: targetStatus } : t
              ),
            })),
          };
        }
      );

      try {
        await api.patch(`/tasks/${taskKey}`, { status: targetStatus });
      } catch {
        toast.error("Failed to update status");
      } finally {
        queryClient.invalidateQueries({ queryKey: ["tasks", projectKey] });
      }
    },
    [taskMap, projectKey, queryClient]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {sections.map((section) => (
          <StatusSectionView
            key={section.status}
            section={section}
            orgSlug={orgSlug}
            projectKey={projectKey}
          />
        ))}
      </div>
      <Pagination
        nextCursor={hasNextPage ? "has-more" : null}
        onLoadMore={onLoadMore}
        isLoading={isFetchingNextPage}
      />
      <DragOverlay>
        {activeTask && <TaskRowOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
