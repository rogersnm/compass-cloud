"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { ApiKeyForm } from "./api-key-form";
import type { ApiError, ApiKey, ApiResponse } from "@/lib/api/types";

export function ApiKeyList() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ApiResponse<ApiKey[]>>("/auth/keys"),
  });

  const keys = data?.data ?? [];

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/auth/keys/${deleteTarget.api_key_id}`);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<ApiKey>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (k) => k.name,
      render: (k) => k.name,
    },
    {
      key: "key_prefix",
      header: "Prefix",
      render: (k) => (
        <span className="font-mono text-xs">{k.key_prefix}...</span>
      ),
    },
    {
      key: "last_used",
      header: "Last Used",
      render: (k) =>
        k.last_used
          ? new Date(k.last_used).toLocaleDateString()
          : "Never",
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      sortValue: (k) => k.created_at,
      render: (k) => new Date(k.created_at).toLocaleDateString(),
    },
    {
      key: "api_key_id" as keyof ApiKey,
      header: "",
      render: (k) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(k);
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  if (isLoading) return <TableSkeleton />;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {keys.length} key{keys.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Create API Key
        </Button>
      </div>

      {keys.length > 0 ? (
        <DataTable
          columns={columns}
          data={keys}
          keyExtractor={(k) => k.api_key_id}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No API keys yet.
        </p>
      )}

      <ApiKeyForm open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete API key"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone and any integrations using this key will stop working.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
