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

  it("rejects epic with parent epic", async () => {
    const parentEpic = await createTask({
      projectKey,
      title: "Parent",
      type: "epic",
      orgId,
      userId,
    });

    await expect(
      createTask({
        projectKey,
        title: "Child Epic",
        type: "epic",
        epicKey: parentEpic.key,
        orgId,
        userId,
      })
    ).rejects.toThrow("Epics cannot have a parent epic");
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
});
