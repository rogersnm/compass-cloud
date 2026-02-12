"use client";

import { use } from "react";
import { TaskList } from "@/components/tasks/task-list";

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { orgSlug, key } = use(params);

  return <TaskList projectKey={key} orgSlug={orgSlug} />;
}
