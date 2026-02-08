import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { newTaskId } from "@/lib/id/generate";
import { encodeCursor, decodeCursor } from "@/lib/pagination";

export async function createTask(params: {
  projectKey: string;
  title: string;
  type?: "task" | "epic";
  status?: "open" | "in_progress" | "closed";
  priority?: number | null;
  epicTaskId?: string | null;
  body?: string;
  orgId: string;
  userId: string;
}) {
  const type = params.type || "task";

  // Validate epic constraints
  if (type === "epic" && params.epicTaskId) {
    throw new ValidationError("Epics cannot have a parent epic");
  }

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

  // Generate display_id with collision retry
  let displayId: string;
  let attempts = 0;
  while (true) {
    displayId = newTaskId(params.projectKey);
    const existing = await db
      .select({ task_id: tasks.task_id })
      .from(tasks)
      .where(
        and(
          eq(tasks.organization_id, params.orgId),
          eq(tasks.display_id, displayId),
          eq(tasks.is_current, true),
          isNull(tasks.deleted_at)
        )
      )
      .limit(1);

    if (existing.length === 0) break;
    attempts++;
    if (attempts > 10) throw new Error("Could not generate unique display ID");
  }

  const [task] = await db
    .insert(tasks)
    .values({
      organization_id: params.orgId,
      project_id: project.project_id,
      display_id: displayId,
      title: params.title,
      type,
      status: params.status || "open",
      priority: params.priority ?? null,
      epic_task_id: params.epicTaskId || null,
      body: params.body || "",
      created_by_user_id: params.userId,
    })
    .returning();

  return task;
}

export async function listTasks(
  projectId: string,
  orgId: string,
  filters: {
    status?: string;
    type?: string;
    epicId?: string;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const limit = filters.limit || 50;
  const queryLimit = limit + 1;

  const conditions = [
    eq(tasks.project_id, projectId),
    eq(tasks.organization_id, orgId),
    eq(tasks.is_current, true),
    isNull(tasks.deleted_at),
  ];

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status));
  }
  if (filters.type) {
    conditions.push(eq(tasks.type, filters.type));
  }
  if (filters.epicId) {
    conditions.push(eq(tasks.epic_task_id, filters.epicId));
  }

  if (filters.cursor) {
    const c = decodeCursor(filters.cursor);
    conditions.push(
      sql`(${tasks.created_at}, ${tasks.task_id}) < (${c.createdAt}, ${c.id})`
    );
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.created_at), desc(tasks.task_id))
    .limit(queryLimit);

  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasNext && data.length > 0) {
    const last = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.task_id,
    });
  }

  return { data, nextCursor };
}

export async function getTaskByDisplayId(displayId: string, orgId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.display_id, displayId),
        eq(tasks.organization_id, orgId),
        eq(tasks.is_current, true),
        isNull(tasks.deleted_at)
      )
    )
    .limit(1);

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  return task;
}

export async function updateTask(
  displayId: string,
  updates: {
    title?: string;
    status?: "open" | "in_progress" | "closed";
    priority?: number | null;
    body?: string;
  },
  orgId: string,
  userId: string
) {
  const current = await getTaskByDisplayId(displayId, orgId);

  // Mark old version as not current
  await db
    .update(tasks)
    .set({ is_current: false })
    .where(
      and(
        eq(tasks.task_id, current.task_id),
        eq(tasks.version, current.version)
      )
    );

  // Insert new version
  const [updated] = await db
    .insert(tasks)
    .values({
      task_id: current.task_id,
      version: current.version + 1,
      organization_id: current.organization_id,
      project_id: current.project_id,
      display_id: current.display_id,
      title: updates.title ?? current.title,
      type: current.type,
      status: updates.status ?? current.status,
      priority: updates.priority !== undefined ? updates.priority : current.priority,
      epic_task_id: current.epic_task_id,
      body: updates.body ?? current.body,
      is_current: true,
      created_by_user_id: userId,
    })
    .returning();

  return updated;
}

export async function deleteTask(
  displayId: string,
  orgId: string,
  userId: string
) {
  const current = await getTaskByDisplayId(displayId, orgId);

  // Mark old version as not current
  await db
    .update(tasks)
    .set({ is_current: false })
    .where(
      and(
        eq(tasks.task_id, current.task_id),
        eq(tasks.version, current.version)
      )
    );

  // Insert final version with deleted_at
  await db.insert(tasks).values({
    task_id: current.task_id,
    version: current.version + 1,
    organization_id: current.organization_id,
    project_id: current.project_id,
    display_id: current.display_id,
    title: current.title,
    type: current.type,
    status: current.status,
    priority: current.priority,
    epic_task_id: current.epic_task_id,
    body: current.body,
    is_current: false,
    created_by_user_id: userId,
    deleted_at: new Date(),
  });
}
