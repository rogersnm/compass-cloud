"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { DocumentForm } from "./document-form";
import type { Document, PaginatedResponse } from "@/lib/api/types";

const columns: Column<Document>[] = [
  {
    key: "key",
    header: "ID",
    render: (d) => (
      <span className="font-mono text-xs">{d.key}</span>
    ),
    className: "w-28",
  },
  {
    key: "title",
    header: "Title",
    render: (d) => d.title,
    sortable: true,
    sortValue: (d) => d.title,
  },
  {
    key: "created_at",
    header: "Created",
    render: (d) => new Date(d.created_at).toLocaleDateString(),
    sortable: true,
    sortValue: (d) => d.created_at,
    className: "w-28",
  },
];

interface DocumentListProps {
  projectKey: string;
  orgSlug: string;
}

export function DocumentList({ projectKey, orgSlug }: DocumentListProps) {
  const router = useRouter();
  const [cursor, setCursor] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", projectKey, cursor],
    queryFn: () =>
      api.get<PaginatedResponse<Document>>(
        `/projects/${projectKey}/documents?limit=50${cursor ? `&cursor=${cursor}` : ""}`
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)} size="sm">
          New Document
        </Button>
      </div>

      {isLoading && <TableSkeleton rows={5} cols={3} />}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No documents yet"
          description="Create your first document."
          action={
            <Button onClick={() => setFormOpen(true)}>New Document</Button>
          }
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={data.data}
            onRowClick={(d) =>
              router.push(`/${orgSlug}/projects/${projectKey}/documents/${d.key}`)
            }
            keyExtractor={(d) => d.document_id}
          />
          <Pagination
            nextCursor={data.next_cursor}
            onLoadMore={() => {
              if (data.next_cursor) setCursor(data.next_cursor);
            }}
          />
        </>
      )}

      <DocumentForm open={formOpen} onOpenChange={setFormOpen} projectKey={projectKey} />
    </div>
  );
}
