"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiError, ApiResponse, Organization } from "@/lib/api/types";

interface OrgSettingsFormProps {
  orgSlug: string;
  isAdmin: boolean;
}

export function OrgSettingsForm({ orgSlug, isAdmin }: OrgSettingsFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["org", orgSlug],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization>>(`/orgs/${orgSlug}`);
      if (!initialized) {
        setName(res.data.name);
        setInitialized(true);
      }
      return res;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      await api.patch(`/orgs/${orgSlug}`, { name });
      await queryClient.invalidateQueries({ queryKey: ["org", orgSlug] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded bg-muted" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Organization updated.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isAdmin}
          required
        />
      </div>
      {isAdmin && (
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      )}
    </form>
  );
}
