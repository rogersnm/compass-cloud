import { db } from "@/lib/db";
import { documents, projects } from "@/lib/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { newDocId } from "@/lib/id/generate";
import { encodeCursor, decodeCursor } from "@/lib/pagination";

export async function createDocument(params: {
  projectKey: string;
  title: string;
  body?: string;
  orgId: string;
  userId: string;
}) {
  // Get project to validate it exists and get project_id
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organization_id, params.orgId),
        eq(projects.key, params.projectKey),
        eq(projects.is_current, true),
        isNull(projects.deleted_at)
      )
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  // Generate key with collision retry
  let displayId: string;
  let attempts = 0;
  while (true) {
    displayId = newDocId(params.projectKey);
    const existing = await db
      .select({ document_id: documents.document_id })
      .from(documents)
      .where(
        and(
          eq(documents.organization_id, params.orgId),
          eq(documents.key, displayId),
          eq(documents.is_current, true),
          isNull(documents.deleted_at)
        )
      )
      .limit(1);

    if (existing.length === 0) break;
    attempts++;
    if (attempts > 10) throw new Error("Could not generate unique display ID");
  }

  const [doc] = await db
    .insert(documents)
    .values({
      organization_id: params.orgId,
      project_id: project.project_id,
      key: displayId,
      title: params.title,
      body: params.body || "",
      created_by_user_id: params.userId,
    })
    .returning();

  return doc;
}

export async function listDocuments(
  projectId: string,
  orgId: string,
  filters: {
    cursor?: string;
    limit?: number;
  } = {}
) {
  const limit = filters.limit || 50;
  const queryLimit = limit + 1;

  const conditions = [
    eq(documents.project_id, projectId),
    eq(documents.organization_id, orgId),
    eq(documents.is_current, true),
    isNull(documents.deleted_at),
  ];

  if (filters.cursor) {
    const c = decodeCursor(filters.cursor);
    conditions.push(
      sql`(${documents.created_at}, ${documents.document_id}) < (${c.createdAt}, ${c.id})`
    );
  }

  const rows = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.created_at), desc(documents.document_id))
    .limit(queryLimit);

  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasNext && data.length > 0) {
    const last = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.document_id,
    });
  }

  return { data, nextCursor };
}

export async function getDocumentByDisplayId(displayId: string, orgId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.key, displayId),
        eq(documents.organization_id, orgId),
        eq(documents.is_current, true),
        isNull(documents.deleted_at)
      )
    )
    .limit(1);

  if (!doc) {
    throw new NotFoundError("Document not found");
  }

  return doc;
}

export async function updateDocument(
  displayId: string,
  updates: {
    title?: string;
    body?: string;
  },
  orgId: string,
  userId: string
) {
  const current = await getDocumentByDisplayId(displayId, orgId);

  // Mark old version as not current
  await db
    .update(documents)
    .set({ is_current: false })
    .where(
      and(
        eq(documents.document_id, current.document_id),
        eq(documents.version, current.version)
      )
    );

  // Insert new version
  const [updated] = await db
    .insert(documents)
    .values({
      document_id: current.document_id,
      version: current.version + 1,
      organization_id: current.organization_id,
      project_id: current.project_id,
      key: current.key,
      title: updates.title ?? current.title,
      body: updates.body ?? current.body,
      is_current: true,
      created_by_user_id: userId,
    })
    .returning();

  return updated;
}

export async function getDocumentVersions(displayId: string, orgId: string) {
  // Find the document_id from any row with this key in this org
  const [any] = await db
    .select({ document_id: documents.document_id })
    .from(documents)
    .where(
      and(
        eq(documents.key, displayId),
        eq(documents.organization_id, orgId)
      )
    )
    .limit(1);

  if (!any) {
    throw new NotFoundError("Document not found");
  }

  const versions = await db
    .select()
    .from(documents)
    .where(eq(documents.document_id, any.document_id))
    .orderBy(desc(documents.version));

  return versions;
}

export async function deleteDocument(
  displayId: string,
  orgId: string,
  userId: string
) {
  const current = await getDocumentByDisplayId(displayId, orgId);

  // Mark old version as not current
  await db
    .update(documents)
    .set({ is_current: false })
    .where(
      and(
        eq(documents.document_id, current.document_id),
        eq(documents.version, current.version)
      )
    );

  // Insert final version with deleted_at
  await db.insert(documents).values({
    document_id: current.document_id,
    version: current.version + 1,
    organization_id: current.organization_id,
    project_id: current.project_id,
    key: current.key,
    title: current.title,
    body: current.body,
    is_current: false,
    created_by_user_id: userId,
    deleted_at: new Date(),
  });
}
