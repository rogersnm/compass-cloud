"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiError, ApiResponse, Project } from "@/lib/api/types";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  const isEdit = !!project;
  const [name, setName] = useState(project?.name ?? "");
  const [key, setKey] = useState("");
  const [body, setBody] = useState(project?.body ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit) {
        await api.patch<ApiResponse<Project>>(`/projects/${project.key}`, {
          name: name || undefined,
          body,
        });
      } else {
        await api.post<ApiResponse<Project>>("/projects", {
          name,
          key: key || undefined,
          body: body || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      setName("");
      setKey("");
      setBody("");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="proj-name">Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="My Project"
            />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="proj-key">
                Key <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="proj-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="AUTO"
                maxLength={5}
                pattern="[A-Z0-9]*"
              />
              <p className="text-xs text-muted-foreground">
                2-5 uppercase letters/numbers. Auto-generated if left empty.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="proj-body">Description</Label>
            <Textarea
              id="proj-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Project description (markdown)"
            />
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
