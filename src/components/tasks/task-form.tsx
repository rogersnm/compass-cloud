"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import type { ApiError, ApiResponse, Task } from "@/lib/api/types";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  task?: Task;
}

export function TaskForm({ open, onOpenChange, projectKey, task }: TaskFormProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [type, setType] = useState<string>(task?.type ?? "task");
  const [status, setStatus] = useState<string>(task?.status ?? "open");
  const [priority, setPriority] = useState<string>(
    task?.priority !== null && task?.priority !== undefined
      ? String(task.priority)
      : "none"
  );
  const [body, setBody] = useState(task?.body ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const priorityVal = priority === "none" ? null : Number(priority);

    try {
      if (isEdit) {
        await api.patch<ApiResponse<Task>>(`/tasks/${task.display_id}`, {
          title: title || undefined,
          status,
          priority: priorityVal,
          body,
        });
      } else {
        await api.post<ApiResponse<Task>>(`/projects/${projectKey}/tasks`, {
          title,
          type,
          status,
          priority: priorityVal,
          body: body || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
      setTitle("");
      setType("task");
      setStatus("open");
      setPriority("none");
      setBody("");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to save task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Task title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="0">P0 (Critical)</SelectItem>
                  <SelectItem value="1">P1 (High)</SelectItem>
                  <SelectItem value="2">P2 (Medium)</SelectItem>
                  <SelectItem value="3">P3 (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <MarkdownEditor value={body} onChange={setBody} defaultMode="edit" />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
