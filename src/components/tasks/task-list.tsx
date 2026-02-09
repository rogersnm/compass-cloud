"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { TaskFilters } from "./task-filters";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
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

interface TaskListProps {
  projectKey: string;
  orgSlug: string;
}

export function TaskList({ projectKey, orgSlug }: TaskListProps) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [cursor, setCursor] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const params = new URLSearchParams();
  params.set("limit", "50");
  if (status !== "all") params.set("status", status);
  if (type !== "all") params.set("type", type);
  if (cursor) params.set("cursor", cursor);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", projectKey, status, type, cursor],
    queryFn: () =>
      api.get<PaginatedResponse<Task>>(
        `/projects/${projectKey}/tasks?${params.toString()}`
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TaskFilters
          status={status}
          type={type}
          onStatusChange={(v) => { setStatus(v); setCursor(undefined); }}
          onTypeChange={(v) => { setType(v); setCursor(undefined); }}
        />
        <Button onClick={() => setFormOpen(true)} size="sm">
          New Task
        </Button>
      </div>

      {isLoading && <TableSkeleton rows={5} cols={5} />}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="No tasks found"
          description="Create your first task or adjust your filters."
          action={
            <Button onClick={() => setFormOpen(true)}>New Task</Button>
          }
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={data.data}
            onRowClick={(t) => router.push(`/${orgSlug}/tasks/${t.key}`)}
            keyExtractor={(t) => t.task_id}
          />
          <Pagination
            nextCursor={data.next_cursor}
            onLoadMore={() => {
              if (data.next_cursor) setCursor(data.next_cursor);
            }}
          />
        </>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projectKey={projectKey}
      />
    </div>
  );
}
