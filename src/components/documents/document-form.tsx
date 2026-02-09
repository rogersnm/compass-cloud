"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import type { ApiError, ApiResponse, Document } from "@/lib/api/types";

interface DocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  document?: Document;
}

export function DocumentForm({
  open,
  onOpenChange,
  projectKey,
  document,
}: DocumentFormProps) {
  const isEdit = !!document;
  const [title, setTitle] = useState(document?.title ?? "");
  const [body, setBody] = useState(document?.body ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit) {
        await api.patch<ApiResponse<Document>>(
          `/documents/${document.key}`,
          { title: title || undefined, body }
        );
      } else {
        await api.post<ApiResponse<Document>>(
          `/projects/${projectKey}/documents`,
          { title, body: body || undefined }
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      onOpenChange(false);
      setTitle("");
      setBody("");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to save document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Document" : "New Document"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Document title"
            />
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
