"use client";

import { use } from "react";
import { DocumentList } from "@/components/documents/document-list";

export default function ProjectDocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; key: string }>;
}) {
  const { orgSlug, key } = use(params);

  return <DocumentList projectKey={key} orgSlug={orgSlug} />;
}
