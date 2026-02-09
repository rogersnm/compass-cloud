"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MarkdownRenderer } from "@/components/editor/markdown-renderer";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { TaskForm } from "@/components/tasks/task-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiError, ApiResponse, Task } from "@/lib/api/types";

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; displayId: string }>;
}) {
  const { orgSlug, displayId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["task", displayId],
    queryFn: () => api.get<ApiResponse<Task>>(`/tasks/${displayId}`),
  });

  const task = data?.data;

  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    try {
      await api.patch(`/tasks/${displayId}`, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["task", displayId] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Status change failed");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/tasks/${displayId}`);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      router.back();
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Delete failed");
      setDeleting(false);
    }
  }

  if (isLoading) return <CardSkeleton />;
  if (!task) return <p className="text-muted-foreground">Task not found.</p>;

  // Determine the project key from key (format: KEY-T12345)
  const projectKey = task.key.split("-")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {task.key}
            </span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.type === "epic" && (
              <Badge variant="secondary">Epic</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          {task.type !== "epic" && task.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("in_progress")}
            >
              Start
            </Button>
          )}
          {task.type !== "epic" && (task.status === "open" || task.status === "in_progress") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("closed")}
            >
              Close
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/tasks/${displayId}/history`}>
              History
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          <MarkdownRenderer content={task.body} />
        </div>
        <aside className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Project</p>
            <p>{projectKey}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Type</p>
            <p className="capitalize">{task.type}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Created</p>
            <p>{new Date(task.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Version</p>
            <p>{task.version}</p>
          </div>
        </aside>
      </div>

      <TaskForm
        open={editOpen}
        onOpenChange={setEditOpen}
        projectKey={projectKey}
        task={task}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description={`Delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
