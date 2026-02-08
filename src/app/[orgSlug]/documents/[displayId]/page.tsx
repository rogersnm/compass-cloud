"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/editor/markdown-renderer";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiError, ApiResponse, Document } from "@/lib/api/types";

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; displayId: string }>;
}) {
  const { orgSlug, displayId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["document", displayId],
    queryFn: () => api.get<ApiResponse<Document>>(`/documents/${displayId}`),
  });

  const doc = data?.data;

  function startEdit() {
    if (!doc) return;
    setEditTitle(doc.title);
    setEditBody(doc.body);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.patch(`/documents/${displayId}`, {
        title: editTitle || undefined,
        body: editBody,
      });
      await queryClient.invalidateQueries({ queryKey: ["document", displayId] });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditing(false);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/documents/${displayId}`);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.back();
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Delete failed");
      setDeleting(false);
    }
  }

  if (isLoading) return <CardSkeleton />;
  if (!doc) return <p className="text-muted-foreground">Document not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="font-mono text-sm text-muted-foreground">
            {doc.display_id}
          </span>
          {editing ? (
            <input
              className="block w-full border-b bg-transparent text-2xl font-bold tracking-tight outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${orgSlug}/documents/${displayId}/history`}>
                  History
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <MarkdownEditor value={editBody} onChange={setEditBody} defaultMode="split" />
      ) : (
        <MarkdownRenderer content={doc.body} />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete document"
        description={`Delete "${doc.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
