"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse, Project, Task } from "@/lib/api/types";

export default function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<PaginatedResponse<Project>>("/projects?limit=100"),
  });

  const projectCount = projects.data?.data.length ?? 0;

  const openTaskCounts = useQuery({
    queryKey: ["open-tasks"],
    queryFn: async () => {
      if (!projects.data?.data.length) return 0;
      let total = 0;
      for (const p of projects.data.data) {
        const res = await api.get<PaginatedResponse<Task>>(
          `/projects/${p.key}/tasks?status=open&limit=1`
        );
        total += res.data.length;
      }
      return total;
    },
    enabled: !!projects.data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Projects</CardDescription>
            {projects.isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="text-3xl">{projectCount}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open Tasks</CardDescription>
            {openTaskCounts.isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="text-3xl">
                {openTaskCounts.data ?? 0}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/${orgSlug}/projects`}>View Projects</Link>
        </Button>
      </div>
    </div>
  );
}
