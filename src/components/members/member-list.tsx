"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiError, ApiResponse, Member } from "@/lib/api/types";

interface MemberListProps {
  orgSlug: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function MemberList({ orgSlug, currentUserId, isAdmin }: MemberListProps) {
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["members", orgSlug],
    queryFn: () =>
      api.get<ApiResponse<Member[]>>(`/orgs/${orgSlug}/members`),
  });

  const members = data?.data ?? [];
  const adminCount = members.filter((m) => m.role === "admin").length;

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.patch(`/orgs/${orgSlug}/members/${userId}`, { role: newRole });
      await queryClient.invalidateQueries({ queryKey: ["members", orgSlug] });
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Role change failed");
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.del(`/orgs/${orgSlug}/members/${removeTarget.user_id}`);
      await queryClient.invalidateQueries({ queryKey: ["members", orgSlug] });
      setRemoveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Remove failed");
    } finally {
      setRemoving(false);
    }
  }

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (m) => m.name,
      render: (m) => m.name,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortValue: (m) => m.email,
      render: (m) => m.email,
    },
    {
      key: "role",
      header: "Role",
      render: (member) => {
        const isLastAdmin = member.role === "admin" && adminCount <= 1;
        const isSelf = member.user_id === currentUserId;

        if (!isAdmin || isLastAdmin || isSelf) {
          return <span className="capitalize">{member.role}</span>;
        }

        return (
          <Select
            value={member.role}
            onValueChange={(val) => handleRoleChange(member.user_id, val)}
          >
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      sortValue: (m) => m.created_at,
      render: (member) => new Date(member.created_at).toLocaleDateString(),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: "user_id" as keyof Member,
      header: "",
      render: (member) => {
        const isLastAdmin = member.role === "admin" && adminCount <= 1;
        const isSelf = member.user_id === currentUserId;

        if (isLastAdmin || isSelf) return null;

        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setRemoveTarget(member);
            }}
          >
            Remove
          </Button>
        );
      },
    });
  }

  if (isLoading) return <TableSkeleton />;

  return (
    <>
      <DataTable
        columns={columns}
        data={members}
        keyExtractor={(m) => m.user_id}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove member"
        description={`Remove ${removeTarget?.name} (${removeTarget?.email}) from this organization?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
        loading={removing}
      />
    </>
  );
}
