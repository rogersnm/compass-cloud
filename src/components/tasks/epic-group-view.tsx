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
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { api } from "@/lib/api/client";
import { groupTasksByEpic, type EpicSection, type SubEpicSection } from "@/lib/utils/group-by-epic";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/api/types";

interface EpicGroupViewProps {
  projectKey: string;
  orgSlug: string;
  statusFilter: string;
  onAddTask: (epicKey: string | null) => void;
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
      <span className="text-sm flex-1 truncate">{task.title}</span>
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

function SubEpicView({
  section,
  orgSlug,
  projectKey,
  onAddTask,
}: {
  section: SubEpicSection;
  orgSlug: string;
  projectKey: string;
  onAddTask: (epicKey: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const progress = section.totalCount > 0
    ? Math.round((section.closedCount / section.totalCount) * 100)
    : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="ml-6">
      <DroppableSection id={`epic:${section.epic.key}`}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="font-mono text-xs text-muted-foreground">{section.epic.key}</span>
          <span className="text-sm font-medium truncate">{section.epic.title}</span>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Progress value={progress} className="w-16 h-1.5" />
            <span className="text-xs text-muted-foreground">
              {section.closedCount}/{section.totalCount}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t pl-6">
          {section.tasks.map((task) => (
            <DraggableTaskRow key={task.key} task={task} orgSlug={orgSlug} projectKey={projectKey} />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground ml-3"
            onClick={() => onAddTask(section.epic.key)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add task
          </Button>
        </CollapsibleContent>
      </DroppableSection>
    </Collapsible>
  );
}

function EpicSectionView({
  section,
  orgSlug,
  projectKey,
  onAddTask,
}: {
  section: EpicSection;
  orgSlug: string;
  projectKey: string;
  onAddTask: (epicKey: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const progress = section.totalCount > 0
    ? Math.round((section.closedCount / section.totalCount) * 100)
    : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <DroppableSection id={`epic:${section.epic.key}`}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="font-mono text-xs text-muted-foreground">{section.epic.key}</span>
          <span className="text-sm font-semibold truncate">{section.epic.title}</span>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Progress value={progress} className="w-20 h-1.5" />
            <span className="text-xs text-muted-foreground">
              {section.closedCount}/{section.totalCount}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t pl-4">
          {section.tasks.map((task) => (
            <DraggableTaskRow key={task.key} task={task} orgSlug={orgSlug} projectKey={projectKey} />
          ))}
          {section.subEpics.map((sub) => (
            <SubEpicView
              key={sub.epic.key}
              section={sub}
              orgSlug={orgSlug}
              projectKey={projectKey}
              onAddTask={onAddTask}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground ml-3"
            onClick={() => onAddTask(section.epic.key)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add task
          </Button>
        </CollapsibleContent>
      </DroppableSection>
    </Collapsible>
  );
}

export function EpicGroupView({
  projectKey,
  orgSlug,
  statusFilter,
  onAddTask,
}: EpicGroupViewProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: allTasks } = useQuery({
    queryKey: ["all-tasks", projectKey],
    queryFn: () => fetchAllPages(projectKey, "task"),
  });

  const { data: allEpics } = useQuery({
    queryKey: ["all-epics", projectKey],
    queryFn: () => fetchAllPages(projectKey, "epic"),
  });

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return allTasks ?? [];
    return (allTasks ?? []).filter((t) => t.status === statusFilter);
  }, [allTasks, statusFilter]);

  const grouped = useMemo(
    () => groupTasksByEpic(filteredTasks, allEpics ?? []),
    [filteredTasks, allEpics]
  );

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of allTasks ?? []) m.set(t.key, t);
    return m;
  }, [allTasks]);

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

      // Parse target: "epic:<key>" or "epic:__none__"
      if (!overId.startsWith("epic:")) return;
      const targetEpicKey = overId.replace("epic:", "");
      const newEpicKey = targetEpicKey === "__none__" ? null : targetEpicKey;

      const task = taskMap.get(taskKey);
      if (!task || task.epic_key === newEpicKey) return;

      // Optimistic update
      queryClient.setQueryData<Task[]>(["all-tasks", projectKey], (old) =>
        (old ?? []).map((t) =>
          t.key === taskKey ? { ...t, epic_key: newEpicKey } : t
        )
      );

      try {
        await api.patch(`/tasks/${taskKey}`, { epic_key: newEpicKey });
      } catch {
        toast.error("Failed to move task");
      } finally {
        queryClient.invalidateQueries({ queryKey: ["all-tasks", projectKey] });
        queryClient.invalidateQueries({ queryKey: ["all-epics", projectKey] });
      }
    },
    [taskMap, projectKey, queryClient]
  );

  const hasFilters = statusFilter !== "all";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {grouped.sections
          .filter((s) => !hasFilters || s.totalCount > 0 || s.subEpics.length > 0)
          .map((section) => (
            <EpicSectionView
              key={section.epic.key}
              section={section}
              orgSlug={orgSlug}
              projectKey={projectKey}
              onAddTask={onAddTask}
            />
          ))}

        {grouped.unassigned.length > 0 && (
          <DroppableSection id="epic:__none__">
            <div className="pt-4">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  No Epic
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {grouped.unassigned.length}
                </span>
              </div>
              <div className="border-t pl-4">
                {grouped.unassigned.map((task) => (
                  <DraggableTaskRow
                    key={task.key}
                    task={task}
                    orgSlug={orgSlug}
                    projectKey={projectKey}
                  />
                ))}
              </div>
            </div>
          </DroppableSection>
        )}

        {grouped.sections.length === 0 && grouped.unassigned.length === 0 && (
          <DroppableSection id="epic:__none__">
            <p className="text-sm text-muted-foreground py-8 text-center">
              No tasks found. Adjust your filters or create a task.
            </p>
          </DroppableSection>
        )}
      </div>

      <DragOverlay>
        {activeTask && <TaskRowOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
