"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { TaskFilters, type GroupBy } from "./task-filters";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { StatusGroupView } from "./status-group-view";
import { EpicGroupView } from "./epic-group-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";
import { TaskForm } from "./task-form";
import type { PaginatedResponse, Task } from "@/lib/api/types";

const columns: Column<Task>[] = [
  {
    key: "key",
    header: "ID",
    render: (t) => (
      <span className="font-mono text-xs">{t.key}</span>
    ),
    className: "w-28",
  },
  {
    key: "title",
    header: "Title",
    render: (t) => (
      <div className="flex items-center gap-2">
        <span>{t.title}</span>
        {t.type === "epic" && (
          <Badge variant="secondary" className="text-xs">epic</Badge>
        )}
      </div>
    ),
    sortable: true,
    sortValue: (t) => t.title,
  },
  {
    key: "status",
    header: "Status",
    render: (t) => <StatusBadge status={t.status} />,
    className: "w-28",
  },
  {
    key: "priority",
    header: "Priority",
    render: (t) => <PriorityBadge priority={t.priority} />,
    sortable: true,
    sortValue: (t) => t.priority ?? 99,
    className: "w-20",
  },
  {
    key: "created_at",
    header: "Created",
    render: (t) => new Date(t.created_at).toLocaleDateString(),
    sortable: true,
    sortValue: (t) => t.created_at,
    className: "w-28",
  },
];

const STATUS_ORDER = ["in_progress", "open", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  open: "Open",
  closed: "Closed",
};

interface TaskListProps {
  projectKey: string;
  orgSlug: string;
}

export function TaskList({ projectKey, orgSlug }: TaskListProps) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [formEpicKey, setFormEpicKey] = useState<string | null>(null);

  // Persist groupBy per-project in localStorage
  const storageKey = `compass_groupby_${projectKey}`;
  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    if (typeof window === "undefined") return "status";
    const stored = localStorage.getItem(storageKey);
    if (stored === "none" || stored === "status" || stored === "epic") return stored;
    return "status";
  });

  const handleGroupByChange = (value: GroupBy) => {
    setGroupBy(value);
    localStorage.setItem(storageKey, value);
  };

  const buildParams = (cursor?: string) => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status !== "all") params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["tasks", projectKey, status],
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<Task>>(
        `/projects/${projectKey}/tasks?${buildParams(pageParam)}`
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: groupBy !== "epic", // epic mode uses its own queries
  });

  const allTasks = data?.pages.flatMap((p) => p.data) ?? [];
  const hasFilter = status !== "all";

  const sections = !hasFilter && allTasks.length > 0
    ? STATUS_ORDER.map((s) => ({
        status: s,
        label: STATUS_LABELS[s],
        tasks: allTasks.filter((t) => t.status === s),
      })).filter((s) => s.tasks.length > 0)
    : null;

  const handleAddTaskInEpic = (epicKey: string | null) => {
    setFormEpicKey(epicKey);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setFormEpicKey(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TaskFilters
          status={status}
          groupBy={groupBy}
          onStatusChange={setStatus}
          onGroupByChange={handleGroupByChange}
        />
        <Button onClick={() => setFormOpen(true)} size="sm">
          New Task
        </Button>
      </div>

      {groupBy === "epic" && (
        <EpicGroupView
          projectKey={projectKey}
          orgSlug={orgSlug}
          statusFilter={status}
          onAddTask={handleAddTaskInEpic}
        />
      )}

      {groupBy !== "epic" && isLoading && <TableSkeleton rows={5} cols={5} />}

      {groupBy !== "epic" && !isLoading && allTasks.length === 0 && (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="No tasks found"
          description="Create your first task or adjust your filters."
          action={
            <Button onClick={() => setFormOpen(true)}>New Task</Button>
          }
        />
      )}

      {groupBy === "status" && !isLoading && allTasks.length > 0 && sections && (
        <StatusGroupView
          sections={sections}
          orgSlug={orgSlug}
          projectKey={projectKey}
          hasNextPage={!!hasNextPage}
          onLoadMore={() => fetchNextPage()}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}

      {groupBy === "status" && !isLoading && allTasks.length > 0 && !sections && (
        <>
          <DataTable
            columns={columns}
            data={allTasks}
            onRowClick={(t) => router.push(`/${orgSlug}/projects/${projectKey}/tasks/${t.key}`)}
            keyExtractor={(t) => t.task_id}
          />
          <Pagination
            nextCursor={hasNextPage ? "has-more" : null}
            onLoadMore={() => fetchNextPage()}
            isLoading={isFetchingNextPage}
          />
        </>
      )}

      {groupBy === "none" && !isLoading && allTasks.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={allTasks}
            onRowClick={(t) => router.push(`/${orgSlug}/projects/${projectKey}/tasks/${t.key}`)}
            keyExtractor={(t) => t.task_id}
          />
          <Pagination
            nextCursor={hasNextPage ? "has-more" : null}
            onLoadMore={() => fetchNextPage()}
            isLoading={isFetchingNextPage}
          />
        </>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={handleFormClose}
        projectKey={projectKey}
        epicKey={formEpicKey}
      />
    </div>
  );
}
