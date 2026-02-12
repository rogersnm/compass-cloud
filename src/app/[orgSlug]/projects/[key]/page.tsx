"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownRenderer } from "@/components/editor/markdown-renderer";
import { api } from "@/lib/api/client";
import type { ApiResponse, Project } from "@/lib/api/types";

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { key } = use(params);

  const { data } = useQuery({
    queryKey: ["project", key],
    queryFn: () => api.get<ApiResponse<Project>>(`/projects/${key}`),
  });

  const project = data?.data;
  if (!project) return null;

  if (!project.body) {
    return (
      <p className="text-muted-foreground">
        No description yet. Click Edit to add one.
      </p>
    );
  }

  return <MarkdownRenderer content={project.body} />;
}
