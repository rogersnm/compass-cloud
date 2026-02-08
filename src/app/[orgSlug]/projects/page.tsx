"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectForm } from "@/components/projects/project-form";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { FolderKanban } from "lucide-react";
import type { PaginatedResponse, Project } from "@/lib/api/types";

export default function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", cursor],
    queryFn: () =>
      api.get<PaginatedResponse<Project>>(
        `/projects?limit=50${cursor ? `&cursor=${cursor}` : ""}`
      ),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s projects.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New Project</Button>
      </div>

      {isLoading && <TableSkeleton rows={5} cols={3} />}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-10 w-10" />}
          title="No projects yet"
          description="Create your first project to start tracking tasks and documents."
          action={
            <Button onClick={() => setFormOpen(true)}>New Project</Button>
          }
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <ProjectList
            projects={data.data}
            onRowClick={(p) => router.push(`/${orgSlug}/projects/${p.key}`)}
          />
          <Pagination
            nextCursor={data.next_cursor}
            onLoadMore={() => {
              if (data.next_cursor) setCursor(data.next_cursor);
            }}
          />
        </>
      )}

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
