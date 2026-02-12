"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { VersionHistory } from "@/components/versions/version-history";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import type { ApiResponse, Project } from "@/lib/api/types";

export default function ProjectHistoryPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { key } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["project-versions", key],
    queryFn: () =>
      api.get<ApiResponse<Project[]>>(`/projects/${key}/versions`),
  });

  const versions = data?.data ?? [];

  if (isLoading) return <CardSkeleton />;

  return <VersionHistory versions={versions} entityType="project" />;
}
