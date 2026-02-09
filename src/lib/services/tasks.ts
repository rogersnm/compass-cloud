import { db } from "@/lib/db";
import { tasks, projects, taskDependencies } from "@/lib/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { newTaskId } from "@/lib/id/generate";
import { validateDAG } from "@/lib/dag/validate";
import { topologicalSort } from "@/lib/dag/topo-sort";
import { encodeCursor, decodeCursor } from "@/lib/pagination";

export async function createTask(params: {
  projectKey: string;
  title: string;
  type?: "task" | "epic";
  status?: "open" | "in_progress" | "closed";
  priority?: number | null;
  epicKey?: string | null;
  body?: string;
  orgId: string;
  userId: string;
}) {
  const type = params.type || "task";

  // Validate epic constraints
  if (type === "epic" && params.epicKey) {
    throw new ValidationError("Epics cannot have a parent epic");
  }
  if (type === "epic" && params.status) {
    throw new ValidationError("Epics cannot have a status");
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

  // Generate key with collision retry
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
          eq(tasks.key, displayId),
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
      key: displayId,
      title: params.title,
      type,
      status: type === "epic" ? null : (params.status || "open"),
      priority: params.priority ?? null,
      epic_key: params.epicKey || null,
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
    conditions.push(eq(tasks.type, "task"));
  }
  if (filters.type) {
    conditions.push(eq(tasks.type, filters.type));
  }
  if (filters.epicId) {
    conditions.push(eq(tasks.epic_key, filters.epicId));
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
        eq(tasks.key, displayId),
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

  if (current.type === "epic" && updates.status) {
    throw new ValidationError("Epics cannot have a status");
  }

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
      key: current.key,
      title: updates.title ?? current.title,
      type: current.type,
      status: current.type === "epic" ? null : (updates.status ?? current.status),
      priority: updates.priority !== undefined ? updates.priority : current.priority,
      epic_key: current.epic_key,
      body: updates.body ?? current.body,
      is_current: true,
      created_by_user_id: userId,
    })
    .returning();

  return updated;
}

export async function getTaskVersions(displayId: string, orgId: string) {
  // Find the task_id from any row with this key in this org
  const [any] = await db
    .select({ task_id: tasks.task_id })
    .from(tasks)
    .where(
      and(
        eq(tasks.key, displayId),
        eq(tasks.organization_id, orgId)
      )
    )
    .limit(1);

  if (!any) {
    throw new NotFoundError("Task not found");
  }

  const versions = await db
    .select()
    .from(tasks)
    .where(eq(tasks.task_id, any.task_id))
    .orderBy(desc(tasks.version));

  return versions;
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
    key: current.key,
    title: current.title,
    type: current.type,
    status: current.type === "epic" ? null : current.status,
    priority: current.priority,
    epic_key: current.epic_key,
    body: current.body,
    is_current: false,
    created_by_user_id: userId,
    deleted_at: new Date(),
  });
}

export async function updateTaskDependencies(
  displayId: string,
  dependsOnKeys: string[],
  orgId: string,
) {
  // Resolve the source task by display key
  const task = await getTaskByDisplayId(displayId, orgId);
  const taskId = task.task_id;

  if (task.type === "epic") {
    throw new ValidationError("Epics cannot have dependencies");
  }

  // Resolve dependency keys to task_ids
  const resolvedDeps: string[] = [];
  for (const depKey of dependsOnKeys) {
    const dep = await getTaskByDisplayId(depKey, orgId);
    if (dep.task_id === taskId) {
      throw new ValidationError("Task cannot depend on itself");
    }
    if (dep.type === "epic") {
      throw new ValidationError("Cannot depend on an epic");
    }
    resolvedDeps.push(dep.task_id);
  }

  // Load all current tasks in project for DAG validation
  const allTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.project_id, task.project_id),
        eq(tasks.organization_id, orgId),
        eq(tasks.is_current, true),
        isNull(tasks.deleted_at)
      )
    );

  // Load all current edges
  const allEdges = await db
    .select()
    .from(taskDependencies)
    .where(isNull(taskDependencies.deleted_at));

  // Build proposed edge set: remove old edges for this task, add new ones
  const nodeIds = allTasks.map((t) => t.task_id);
  const edges = allEdges
    .filter((e) => e.task_id !== taskId)
    .map((e) => ({ from: e.task_id, to: e.depends_on_task_id }));

  for (const depId of resolvedDeps) {
    edges.push({ from: taskId, to: depId });
  }

  const result = validateDAG(nodeIds, edges);
  if (!result.valid) {
    throw new ValidationError(
      `Cycle detected: ${result.cycle!.join(" -> ")}`
    );
  }

  // Soft-delete existing dependencies for this task
  await db
    .update(taskDependencies)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(taskDependencies.task_id, taskId),
        isNull(taskDependencies.deleted_at)
      )
    );

  // Insert new dependencies
  for (const depId of resolvedDeps) {
    await db.insert(taskDependencies).values({
      task_id: taskId,
      depends_on_task_id: depId,
    });
  }
}

export async function getProjectKeyByTaskProjectId(projectId: string): Promise<string> {
  const [row] = await db
    .select({ key: projects.key })
    .from(projects)
    .where(
      and(
        eq(projects.project_id, projectId),
        eq(projects.is_current, true),
        isNull(projects.deleted_at)
      )
    )
    .limit(1);
  return row?.key ?? "";
}

export async function getTaskDependencies(taskId: string) {
  const deps = await db
    .select()
    .from(taskDependencies)
    .where(
      and(
        eq(taskDependencies.task_id, taskId),
        isNull(taskDependencies.deleted_at)
      )
    );

  return deps.map((d) => d.depends_on_task_id);
}

/** Resolve dependency task_ids to display keys for a set of tasks. */
export async function getDependencyKeysMap(
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (taskIds.length === 0) return result;

  for (const id of taskIds) {
    result.set(id, []);
  }

  const edges = await db
    .select({
      task_id: taskDependencies.task_id,
      dep_key: tasks.key,
    })
    .from(taskDependencies)
    .innerJoin(
      tasks,
      and(
        eq(tasks.task_id, taskDependencies.depends_on_task_id),
        eq(tasks.is_current, true),
        isNull(tasks.deleted_at)
      )
    )
    .where(
      and(
        sql`${taskDependencies.task_id} IN ${taskIds}`,
        isNull(taskDependencies.deleted_at)
      )
    );

  for (const e of edges) {
    const arr = result.get(e.task_id);
    if (arr) arr.push(e.dep_key);
  }

  return result;
}

export function isBlocked(
  taskId: string,
  deps: string[],
  taskStatusMap: Map<string, string>
): boolean {
  return deps.some((depId) => {
    const status = taskStatusMap.get(depId);
    return status !== "closed";
  });
}

export async function getReadyTasks(projectId: string, orgId: string) {
  // Load all current, non-deleted tasks (excluding epics)
  const allTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.project_id, projectId),
        eq(tasks.organization_id, orgId),
        eq(tasks.is_current, true),
        isNull(tasks.deleted_at),
        eq(tasks.type, "task")
      )
    );

  // Load all current edges
  const allEdges = await db
    .select()
    .from(taskDependencies)
    .where(isNull(taskDependencies.deleted_at));

  const taskMap = new Map(allTasks.map((t) => [t.task_id, t]));
  const statusMap = new Map(allTasks.map((t) => [t.task_id, t.status!]));

  // Build dependency map: task_id -> [depends_on_task_id]
  const depMap = new Map<string, string[]>();
  for (const t of allTasks) {
    depMap.set(t.task_id, []);
  }
  for (const e of allEdges) {
    if (depMap.has(e.task_id)) {
      depMap.get(e.task_id)!.push(e.depends_on_task_id);
    }
  }

  // Filter to open/in_progress tasks whose deps are all closed
  const nodeIds = allTasks.map((t) => t.task_id);
  const edges = allEdges
    .filter((e) => taskMap.has(e.task_id) && taskMap.has(e.depends_on_task_id))
    .map((e) => ({ from: e.task_id, to: e.depends_on_task_id }));

  // Topological sort for ordering
  const sorted = topologicalSort(nodeIds, edges);

  // A task is "ready" if it's not closed and all its deps are closed
  const ready = sorted.filter((id) => {
    const task = taskMap.get(id)!;
    if (task.status === "closed") return false;
    const deps = depMap.get(id) || [];
    return !isBlocked(id, deps, statusMap);
  });

  return ready.map((id) => taskMap.get(id)!);
}

export async function getTaskGraph(projectId: string, orgId: string) {
  // Load all current, non-deleted tasks
  const allTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.project_id, projectId),
        eq(tasks.organization_id, orgId),
        eq(tasks.is_current, true),
        isNull(tasks.deleted_at)
      )
    );

  // Load all current edges
  const allEdges = await db
    .select()
    .from(taskDependencies)
    .where(isNull(taskDependencies.deleted_at));

  const taskIds = new Set(allTasks.map((t) => t.task_id));

  // Filter edges to only include those within this project's tasks
  const edges = allEdges
    .filter((e) => taskIds.has(e.task_id) && taskIds.has(e.depends_on_task_id))
    .map((e) => ({
      from: e.task_id,
      to: e.depends_on_task_id,
    }));

  const nodes = allTasks.map((t) => ({
    task_id: t.task_id,
    key: t.key,
    title: t.title,
    type: t.type,
    status: t.status,
    priority: t.priority,
  }));

  return { nodes, edges };
}
