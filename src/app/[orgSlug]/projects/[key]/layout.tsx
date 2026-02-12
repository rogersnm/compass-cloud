"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectForm } from "@/components/projects/project-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiError, ApiResponse, Project } from "@/lib/api/types";

export default function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
  children: React.ReactNode;
}) {
  const { orgSlug, key } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOverview = pathname === `/${orgSlug}/projects/${key}`;

  const { data, isLoading } = useQuery({
    queryKey: ["project", key],
    queryFn: () => api.get<ApiResponse<Project>>(`/projects/${key}`),
  });

  const project = data?.data;

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/projects/${key}`);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/${orgSlug}/projects`);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr.error?.message ?? "Delete failed");
      setDeleting(false);
    }
  }

  if (isLoading) return <CardSkeleton />;
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <Badge variant="secondary" className="font-mono">
              {project.key}
            </Badge>
          </div>
        </div>
        {isOverview && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${orgSlug}/projects/${key}/history`}>
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
        )}
      </div>

      {children}

      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description="This will delete the project and all its tasks and documents. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
