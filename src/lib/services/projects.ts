import { db } from "@/lib/db";
import { projects, tasks, documents } from "@/lib/db/schema";
import { eq, and, isNull, sql, lt, desc } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { generateKey, validateKey } from "@/lib/id/generate";
import { encodeCursor, decodeCursor } from "@/lib/pagination";

export async function createProject(params: {
  name: string;
  key?: string;
  body?: string;
  orgId: string;
  userId: string;
}) {
  let key: string;

  if (params.key) {
    validateKey(params.key);
    key = params.key;
  } else {
    key = generateKey(params.name);
  }

  // Check uniqueness, retry with digit suffix on collision
  key = await resolveKeyCollision(key, params.orgId);

  const [project] = await db
    .insert(projects)
    .values({
      organization_id: params.orgId,
      key,
      name: params.name,
      body: params.body || "",
      created_by_user_id: params.userId,
    })
    .returning();

  return project;
}

async function resolveKeyCollision(
  key: string,
  orgId: string
): Promise<string> {
  const existing = await db
    .select({ project_id: projects.project_id })
    .from(projects)
    .where(
      and(
        eq(projects.organization_id, orgId),
        eq(projects.key, key),
        eq(projects.is_current, true),
        isNull(projects.deleted_at)
      )
    )
    .limit(1);

  if (existing.length === 0) return key;

  // Try appending digits 2-9
  for (let digit = 2; digit <= 9; digit++) {
    const candidate = key.slice(0, 4) + String(digit);
    const found = await db
      .select({ project_id: projects.project_id })
      .from(projects)
      .where(
        and(
          eq(projects.organization_id, orgId),
          eq(projects.key, candidate),
          eq(projects.is_current, true),
          isNull(projects.deleted_at)
        )
      )
      .limit(1);

    if (found.length === 0) return candidate;
  }

  throw new Error(`Cannot generate unique key from "${key}"`);
}

export async function listProjects(
  orgId: string,
  cursor?: string,
  limit: number = 50
) {
  const queryLimit = limit + 1; // extra row to check has_next

  let query = db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organization_id, orgId),
        eq(projects.is_current, true),
        isNull(projects.deleted_at)
      )
    )
    .orderBy(desc(projects.created_at), desc(projects.project_id))
    .limit(queryLimit);

  if (cursor) {
    const c = decodeCursor(cursor);
    query = db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.organization_id, orgId),
          eq(projects.is_current, true),
          isNull(projects.deleted_at),
          sql`(${projects.created_at}, ${projects.project_id}) < (${c.createdAt}, ${c.id})`
        )
      )
      .orderBy(desc(projects.created_at), desc(projects.project_id))
      .limit(queryLimit);
  }

  const rows = await query;
  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasNext && data.length > 0) {
    const last = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.project_id,
    });
  }

  return { data, nextCursor };
}

export async function getProjectByKey(key: string, orgId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organization_id, orgId),
        eq(projects.key, key),
        eq(projects.is_current, true),
        isNull(projects.deleted_at)
      )
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  return project;
}

export async function deleteProject(
  key: string,
  orgId: string,
  userId: string
) {
  const project = await getProjectByKey(key, orgId);
  const now = new Date();

  // Soft-delete all tasks in project
  await db
    .update(tasks)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(tasks.project_id, project.project_id),
        isNull(tasks.deleted_at)
      )
    );

  // Soft-delete all documents in project
  await db
    .update(documents)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(documents.project_id, project.project_id),
        isNull(documents.deleted_at)
      )
    );

  // Soft-delete the project
  await db
    .update(projects)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(projects.project_id, project.project_id),
        eq(projects.version, project.version)
      )
    );
}
