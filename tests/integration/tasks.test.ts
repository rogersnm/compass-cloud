import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject } from "@/lib/services/projects";
import {
  createTask,
  listTasks,
  getTaskByDisplayId,
  updateTask,
  deleteTask,
} from "@/lib/services/tasks";
import { tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

describe("task CRUD", () => {
  let orgId: string;
  let userId: string;
  let projectId: string;
  let projectKey: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
      role: "admin",
    });
    orgId = org.organization_id;
    userId = user.user_id;

    const project = await createProject({
      name: "Test Project",
      key: "TEST",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("creates task with defaults", async () => {
    const task = await createTask({
      projectKey,
      title: "My Task",
      orgId,
      userId,
    });

    expect(task.title).toBe("My Task");
    expect(task.type).toBe("task");
    expect(task.status).toBe("open");
    expect(task.version).toBe(1);
    expect(task.is_current).toBe(true);
    expect(task.key).toMatch(new RegExp(`^${projectKey}-T`));
  });

  it("creates epic with null status", async () => {
    const epic = await createTask({
      projectKey,
      title: "My Epic",
      type: "epic",
      orgId,
      userId,
    });

    expect(epic.type).toBe("epic");
    expect(epic.status).toBeNull();
    expect(epic.epic_key).toBeNull();
  });

  it("rejects status on epic creation", async () => {
    await expect(
      createTask({
        projectKey,
        title: "Bad Epic",
        type: "epic",
        status: "open",
        orgId,
        userId,
      })
    ).rejects.toThrow("Epics cannot have a status");
  });

  it("rejects status update on epic", async () => {
    const epic = await createTask({
      projectKey,
      title: "My Epic",
      type: "epic",
      orgId,
      userId,
    });

    await expect(
      updateTask(epic.key, { status: "closed" }, orgId, userId)
    ).rejects.toThrow("Epics cannot have a status");
  });

  it("creates sub-epic under parent epic", async () => {
    const parent = await createTask({
      projectKey,
      title: "Parent Epic",
      type: "epic",
      orgId,
      userId,
    });

    const child = await createTask({
      projectKey,
      title: "Child Epic",
      type: "epic",
      epicKey: parent.key,
      orgId,
      userId,
    });

    expect(child.type).toBe("epic");
    expect(child.epic_key).toBe(parent.key);
  });

  it("lists sub-epics and tasks under parent epic", async () => {
    const parent = await createTask({
      projectKey,
      title: "Parent Epic",
      type: "epic",
      orgId,
      userId,
    });

    const childEpic = await createTask({
      projectKey,
      title: "Child Epic",
      type: "epic",
      epicKey: parent.key,
      orgId,
      userId,
    });

    const childTask = await createTask({
      projectKey,
      title: "Child Task",
      epicKey: parent.key,
      orgId,
      userId,
    });

    const result = await listTasks(projectId, orgId, { epicId: parent.key });
    expect(result.data).toHaveLength(2);
    const keys = result.data.map((t) => t.key);
    expect(keys).toContain(childEpic.key);
    expect(keys).toContain(childTask.key);
  });

  it("rejects epic_key referencing a task (when creating epic)", async () => {
    const task = await createTask({
      projectKey,
      title: "A Task",
      orgId,
      userId,
    });

    await expect(
      createTask({
        projectKey,
        title: "Bad Epic",
        type: "epic",
        epicKey: task.key,
        orgId,
        userId,
      })
    ).rejects.toThrow("Parent must be an epic");
  });

  it("rejects epic_key referencing a task (when creating task)", async () => {
    const task = await createTask({
      projectKey,
      title: "A Task",
      orgId,
      userId,
    });

    await expect(
      createTask({
        projectKey,
        title: "Bad Task",
        epicKey: task.key,
        orgId,
        userId,
      })
    ).rejects.toThrow("Parent must be an epic");
  });

  it("enforces max epic nesting depth", async () => {
    const epics: string[] = [];
    for (let i = 0; i < 11; i++) {
      const parentKey = i === 0 ? undefined : epics[i - 1];
      const epic = await createTask({
        projectKey,
        title: `Epic Level ${i}`,
        type: "epic",
        epicKey: parentKey,
        orgId,
        userId,
      });
      epics.push(epic.key);
    }

    // 11 levels deep (0 through 10) means the 11th has a parent chain of 11, exceeding MAX_EPIC_DEPTH=10
    await expect(
      createTask({
        projectKey,
        title: "Too Deep",
        type: "epic",
        epicKey: epics[epics.length - 1],
        orgId,
        userId,
      })
    ).rejects.toThrow("Epic nesting exceeds maximum depth of 10");
  });

  it("creates task under epic", async () => {
    const epic = await createTask({
      projectKey,
      title: "My Epic",
      type: "epic",
      orgId,
      userId,
    });

    const task = await createTask({
      projectKey,
      title: "Epic Task",
      epicKey: epic.key,
      orgId,
      userId,
    });

    expect(task.epic_key).toBe(epic.key);
  });

  it("updates task title (creates new version)", async () => {
    const task = await createTask({
      projectKey,
      title: "Original",
      orgId,
      userId,
    });

    const updated = await updateTask(
      task.key,
      { title: "Updated" },
      orgId,
      userId
    );

    expect(updated.title).toBe("Updated");
    expect(updated.version).toBe(2);
    expect(updated.is_current).toBe(true);
    expect(updated.task_id).toBe(task.task_id);

    // Old version should not be current
    const db = getTestDB();
    const [old] = await db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.task_id, task.task_id), eq(tasks.version, 1))
      );
    expect(old.is_current).toBe(false);
  });

  it("updates status (open -> in_progress -> closed)", async () => {
    const task = await createTask({
      projectKey,
      title: "Status Test",
      orgId,
      userId,
    });

    const started = await updateTask(
      task.key,
      { status: "in_progress" },
      orgId,
      userId
    );
    expect(started.status).toBe("in_progress");

    const closed = await updateTask(
      task.key,
      { status: "closed" },
      orgId,
      userId
    );
    expect(closed.status).toBe("closed");
    expect(closed.version).toBe(3);
  });

  it("sets and clears priority", async () => {
    const task = await createTask({
      projectKey,
      title: "Priority Test",
      priority: 2,
      orgId,
      userId,
    });
    expect(task.priority).toBe(2);

    const cleared = await updateTask(
      task.key,
      { priority: null },
      orgId,
      userId
    );
    expect(cleared.priority).toBeNull();
  });

  it("deletes task (final version with deleted_at)", async () => {
    const task = await createTask({
      projectKey,
      title: "Delete Me",
      orgId,
      userId,
    });

    await deleteTask(task.key, orgId, userId);

    await expect(
      getTaskByDisplayId(task.key, orgId)
    ).rejects.toThrow("Task not found");

    // But the rows still exist in DB
    const db = getTestDB();
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_id, task.task_id));
    expect(rows).toHaveLength(2); // version 1 + deleted version 2
    expect(rows[1].deleted_at).not.toBeNull();
  });

  it("lists tasks with filters", async () => {
    await createTask({ projectKey, title: "Open Task", orgId, userId });
    const t2 = await createTask({ projectKey, title: "Started Task", orgId, userId });
    await updateTask(t2.key, { status: "in_progress" }, orgId, userId);
    await createTask({
      projectKey,
      title: "Epic",
      type: "epic",
      orgId,
      userId,
    });

    // All tasks
    const all = await listTasks(projectId, orgId);
    expect(all.data).toHaveLength(3);

    // Filter by status excludes epics (only tasks have status)
    const open = await listTasks(projectId, orgId, { status: "open" });
    expect(open.data).toHaveLength(1);

    const inProgress = await listTasks(projectId, orgId, { status: "in_progress" });
    expect(inProgress.data).toHaveLength(1);

    // Filter by type
    const epics = await listTasks(projectId, orgId, { type: "epic" });
    expect(epics.data).toHaveLength(1);
    expect(epics.data[0].type).toBe("epic");
  });

  it("assigns task to epic via update", async () => {
    const epic = await createTask({
      projectKey,
      title: "Target Epic",
      type: "epic",
      orgId,
      userId,
    });

    const task = await createTask({
      projectKey,
      title: "Unassigned Task",
      orgId,
      userId,
    });

    expect(task.epic_key).toBeNull();

    const updated = await updateTask(
      task.key,
      { epic_key: epic.key },
      orgId,
      userId
    );

    expect(updated.epic_key).toBe(epic.key);
    expect(updated.version).toBe(2);
  });

  it("clears epic_key via update (set to null)", async () => {
    const epic = await createTask({
      projectKey,
      title: "Parent Epic",
      type: "epic",
      orgId,
      userId,
    });

    const task = await createTask({
      projectKey,
      title: "Child Task",
      epicKey: epic.key,
      orgId,
      userId,
    });

    expect(task.epic_key).toBe(epic.key);

    const updated = await updateTask(
      task.key,
      { epic_key: null },
      orgId,
      userId
    );

    expect(updated.epic_key).toBeNull();
  });

  it("rejects epic_key update targeting a non-epic", async () => {
    const regularTask = await createTask({
      projectKey,
      title: "Not an epic",
      orgId,
      userId,
    });

    const task = await createTask({
      projectKey,
      title: "Some Task",
      orgId,
      userId,
    });

    await expect(
      updateTask(task.key, { epic_key: regularTask.key }, orgId, userId)
    ).rejects.toThrow("Parent must be an epic");
  });

  it("rejects circular epic assignment", async () => {
    const epicA = await createTask({
      projectKey,
      title: "Epic A",
      type: "epic",
      orgId,
      userId,
    });

    const epicB = await createTask({
      projectKey,
      title: "Epic B",
      type: "epic",
      epicKey: epicA.key,
      orgId,
      userId,
    });

    // Try to move A under B (circular: B is under A)
    await expect(
      updateTask(epicA.key, { epic_key: epicB.key }, orgId, userId)
    ).rejects.toThrow("Circular epic assignment");
  });
});
