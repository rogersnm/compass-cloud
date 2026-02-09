import { db } from "@/lib/db";
import { projects, tasks, documents } from "@/lib/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

export type SearchResult = {
  type: "project" | "task" | "document";
  id: string;
  display_id: string;
  title: string;
  body: string;
  status?: string;
  project_key?: string;
  created_at: Date;
};

export async function search(params: {
  query: string;
  projectId?: string;
  orgId: string;
  limit?: number;
}) {
  const limit = params.limit || 50;
  const pattern = `%${params.query}%`;

  // Search projects (name, body)
  const projectConditions = [
    eq(projects.organization_id, params.orgId),
    eq(projects.is_current, true),
    isNull(projects.deleted_at),
    sql`(${projects.name} ILIKE ${pattern} OR ${projects.body} ILIKE ${pattern})`,
  ];

  const projectRows = await db
    .select()
    .from(projects)
    .where(and(...projectConditions))
    .orderBy(desc(projects.created_at))
    .limit(limit);

  // Search tasks (title, body)
  const taskConditions = [
    eq(tasks.organization_id, params.orgId),
    eq(tasks.is_current, true),
    isNull(tasks.deleted_at),
    sql`(${tasks.title} ILIKE ${pattern} OR ${tasks.body} ILIKE ${pattern})`,
  ];
  if (params.projectId) {
    taskConditions.push(eq(tasks.project_id, params.projectId));
  }

  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(...taskConditions))
    .orderBy(desc(tasks.created_at))
    .limit(limit);

  // Search documents (title, body)
  const docConditions = [
    eq(documents.organization_id, params.orgId),
    eq(documents.is_current, true),
    isNull(documents.deleted_at),
    sql`(${documents.title} ILIKE ${pattern} OR ${documents.body} ILIKE ${pattern})`,
  ];
  if (params.projectId) {
    docConditions.push(eq(documents.project_id, params.projectId));
  }

  const docRows = await db
    .select()
    .from(documents)
    .where(and(...docConditions))
    .orderBy(desc(documents.created_at))
    .limit(limit);

  // Merge results and sort by created_at desc
  const results: SearchResult[] = [];

  for (const p of projectRows) {
    results.push({
      type: "project",
      id: p.project_id,
      display_id: p.key,
      title: p.name,
      body: p.body,
      created_at: p.created_at,
    });
  }

  for (const t of taskRows) {
    results.push({
      type: "task",
      id: t.task_id,
      display_id: t.display_id,
      title: t.title,
      body: t.body,
      status: t.status ?? undefined,
      created_at: t.created_at,
    });
  }

  for (const d of docRows) {
    results.push({
      type: "document",
      id: d.document_id,
      display_id: d.display_id,
      title: d.title,
      body: d.body,
      created_at: d.created_at,
    });
  }

  results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return results.slice(0, limit);
}
