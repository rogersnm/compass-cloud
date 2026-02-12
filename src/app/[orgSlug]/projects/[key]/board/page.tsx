"use client";

import { use } from "react";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default function ProjectBoardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { orgSlug, key } = use(params);

  return <KanbanBoard projectKey={key} orgSlug={orgSlug} />;
}
