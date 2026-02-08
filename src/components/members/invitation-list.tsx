"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiError, ApiResponse, Invitation } from "@/lib/api/types";

interface InvitationListProps {
  orgSlug: string;
  isAdmin: boolean;
}

export function InvitationList({ orgSlug, isAdmin }: InvitationListProps) {
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<Invitation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invitations", orgSlug],
    queryFn: () =>
      api.get<ApiResponse<Invitation[]>>(`/orgs/${orgSlug}/invitations`),
  });

  const invitations = data?.data ?? [];

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.del(
        `/orgs/${orgSlug}/invitations/${cancelTarget.invitation_id}`
      );
      await queryClient.invalidateQueries({
        queryKey: ["invitations", orgSlug],
      });
      setCancelTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  const columns: Column<Invitation>[] = [
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortValue: (inv) => inv.email,
      render: (inv) => inv.email,
    },
    {
      key: "role",
      header: "Role",
      render: (inv) => <span className="capitalize">{inv.role}</span>,
    },
    {
      key: "expires_at",
      header: "Expires",
      sortable: true,
      sortValue: (inv) => inv.expires_at,
      render: (inv) => new Date(inv.expires_at).toLocaleDateString(),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: "invitation_id" as keyof Invitation,
      header: "",
      render: (inv) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setCancelTarget(inv);
          }}
        >
          Cancel
        </Button>
      ),
    });
  }

  if (isLoading) return <TableSkeleton />;
  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No pending invitations.
      </p>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={invitations}
        keyExtractor={(inv) => inv.invitation_id}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel invitation"
        description={`Cancel the invitation for ${cancelTarget?.email}?`}
        confirmLabel="Cancel Invitation"
        variant="destructive"
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </>
  );
}
