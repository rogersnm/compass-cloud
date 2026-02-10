"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { api } from "@/lib/api/client";
import { KanbanCard } from "./kanban-card";
import { buildEpicBreadcrumb } from "@/lib/utils/epic-breadcrumb";
import { toast } from "sonner";
import type { PaginatedResponse, Task } from "@/lib/api/types";

const STATUSES = ["open", "in_progress", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

async function fetchAllPages(projectKey: string, type: string): Promise<Task[]> {
  const all: Task[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ type, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const res = await api.get<PaginatedResponse<Task>>(
      `/projects/${projectKey}/tasks?${params.toString()}`
    );
    all.push(...res.data);
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return all;
}

function DroppableColumn({ id, children, count }: { id: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{STATUS_LABELS[id]}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 rounded-lg bg-muted/50 p-2 min-h-[200px] transition-colors ${isOver ? "bg-muted" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  projectKey: string;
  orgSlug: string;
}

export function KanbanBoard({ projectKey, orgSlug }: KanbanBoardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Track local overrides for optimistic UI during drag
  const [localStatusOverride, setLocalStatusOverride] = useState<Map<string, Task["status"]>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: tasksData } = useQuery({
    queryKey: ["kanban-tasks", projectKey],
    queryFn: () => fetchAllPages(projectKey, "task"),
  });

  const { data: epicsData } = useQuery({
    queryKey: ["kanban-epics", projectKey],
    queryFn: () => fetchAllPages(projectKey, "epic"),
  });

  const epicMap = useMemo(() => {
    const m = new Map<string, Task>();
    if (epicsData) {
      for (const e of epicsData) m.set(e.key, e);
    }
    return m;
  }, [epicsData]);

  const tasks = useMemo(() => tasksData ?? [], [tasksData]);

  // Group tasks by status, applying local overrides
  const columns = useMemo(() => {
    const grouped: Record<string, Task[]> = { open: [], in_progress: [], closed: [] };
    for (const t of tasks) {
      const status = localStatusOverride.get(t.key) ?? t.status;
      if (grouped[status]) grouped[status].push(t);
    }
    // Sort each column by position
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return grouped;
  }, [tasks, localStatusOverride]);

  function calcPosition(columnTasks: Task[], dropIndex: number, excludeKey?: string): number {
    const filtered = excludeKey
      ? columnTasks.filter((t) => t.key !== excludeKey)
      : columnTasks;

    if (filtered.length === 0) return 1000;
    if (dropIndex <= 0) return (filtered[0].position ?? 0) - 1000;
    if (dropIndex >= filtered.length) return (filtered[filtered.length - 1].position ?? 0) + 1000;

    const before = filtered[dropIndex - 1].position ?? 0;
    const after = filtered[dropIndex].position ?? 0;
    return (before + after) / 2;
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.key === event.active.id);
    setActiveTask(task ?? null);
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeKey = active.id as string;
    const overTarget = over.id as string;

    // Determine target status
    let targetStatus: Task["status"] | undefined;
    if (STATUSES.includes(overTarget as typeof STATUSES[number])) {
      targetStatus = overTarget as Task["status"];
    } else {
      // Over a card, find its status
      const overTask = tasks.find((t) => t.key === overTarget);
      if (overTask) {
        targetStatus = localStatusOverride.get(overTask.key) ?? overTask.status;
      }
    }

    if (targetStatus) {
      const currentStatus = localStatusOverride.get(activeKey) ?? tasks.find((t) => t.key === activeKey)?.status;
      if (currentStatus !== targetStatus) {
        setLocalStatusOverride((prev) => new Map(prev).set(activeKey, targetStatus));
      }
    }
  }, [tasks, localStatusOverride]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      setLocalStatusOverride(new Map());
      return;
    }

    const activeKey = active.id as string;
    const task = tasks.find((t) => t.key === activeKey);
    if (!task) {
      setLocalStatusOverride(new Map());
      return;
    }

    // Determine target status
    let targetStatus: Task["status"];
    const overTarget = over.id as string;
    if (STATUSES.includes(overTarget as Task["status"])) {
      targetStatus = overTarget as Task["status"];
    } else {
      const overTask = tasks.find((t) => t.key === overTarget);
      targetStatus = localStatusOverride.get(overTarget) ?? overTask?.status ?? task.status;
    }

    // Find drop index
    const targetColumn = columns[targetStatus] ?? [];
    let dropIndex: number;
    if (STATUSES.includes(overTarget as typeof STATUSES[number])) {
      dropIndex = targetColumn.length;
    } else {
      const idx = targetColumn.findIndex((t) => t.key === overTarget);
      dropIndex = idx >= 0 ? idx : targetColumn.length;
    }

    const newPosition = calcPosition(targetColumn, dropIndex, activeKey);
    const statusChanged = targetStatus !== task.status;

    // Optimistically update the cache so the card stays where it was dropped
    queryClient.setQueryData<Task[]>(["kanban-tasks", projectKey], (old) =>
      (old ?? []).map((t) =>
        t.key === activeKey
          ? { ...t, status: targetStatus, position: newPosition }
          : t
      )
    );

    // Clear local overrides now that the cache reflects the new state
    setLocalStatusOverride(new Map());

    try {
      if (statusChanged) {
        await api.patch(`/tasks/${activeKey}`, { status: targetStatus });
      }
      await api.patch(`/tasks/${activeKey}/reorder`, { position: newPosition });
    } catch {
      toast.error("Failed to update task position");
    } finally {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks", projectKey] });
    }
  }, [tasks, columns, localStatusOverride, projectKey, queryClient]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const columnTasks = columns[status] ?? [];
          return (
            <DroppableColumn key={status} id={status} count={columnTasks.length}>
              <SortableContext
                items={columnTasks.map((t) => t.key)}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.map((task) => (
                  <KanbanCard
                    key={task.key}
                    task={task}
                    epicBreadcrumb={buildEpicBreadcrumb(task.epic_key, epicMap)}
                    onClick={() => router.push(`/${orgSlug}/tasks/${task.key}`)}
                  />
                ))}
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            epicBreadcrumb={buildEpicBreadcrumb(activeTask.epic_key, epicMap)}
            onClick={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
