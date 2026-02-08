"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { VersionHistory } from "@/components/versions/version-history";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiResponse, Project } from "@/lib/api/types";

export default function ProjectHistoryPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { orgSlug, key } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["project-versions", key],
    queryFn: () =>
      api.get<ApiResponse<Project[]>>(`/projects/${key}/versions`),
  });

  const versions = data?.data ?? [];

  if (isLoading) return <CardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Version History
          </h1>
          <p className="text-sm text-muted-foreground">
            {key}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${orgSlug}/projects/${key}`}>Back to Project</Link>
        </Button>
      </div>

      <VersionHistory versions={versions} entityType="project" />
    </div>
  );
}
