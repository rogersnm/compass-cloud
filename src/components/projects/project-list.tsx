"use client";

import { DataTable, type Column } from "@/components/shared/data-table";
import type { Project } from "@/lib/api/types";

const columns: Column<Project>[] = [
  {
    key: "key",
    header: "Key",
    render: (p) => (
      <span className="font-mono text-xs font-medium">{p.key}</span>
    ),
    sortable: true,
    sortValue: (p) => p.key,
    className: "w-24",
  },
  {
    key: "name",
    header: "Name",
    render: (p) => p.name,
    sortable: true,
    sortValue: (p) => p.name,
  },
  {
    key: "created_at",
    header: "Created",
    render: (p) => new Date(p.created_at).toLocaleDateString(),
    sortable: true,
    sortValue: (p) => p.created_at,
    className: "w-32",
  },
];

interface ProjectListProps {
  projects: Project[];
  onRowClick: (project: Project) => void;
}

export function ProjectList({ projects, onRowClick }: ProjectListProps) {
  return (
    <DataTable
      columns={columns}
      data={projects}
      onRowClick={onRowClick}
      keyExtractor={(p) => p.project_id}
    />
  );
}
