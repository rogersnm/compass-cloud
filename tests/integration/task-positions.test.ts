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
  deleteTask,
  reorderTask,
} from "@/lib/services/tasks";
import { taskPositions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("task positions", () => {
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

  it("auto-creates position on task creation", async () => {
    const task = await createTask({
      projectKey,
      title: "First",
      orgId,
      userId,
    });

    const db = getTestDB();
    const [pos] = await db
      .select()
      .from(taskPositions)
      .where(eq(taskPositions.task_id, task.task_id));

    expect(pos).toBeDefined();
    expect(pos.position).toBe(1000);
  });

  it("does not create position for epics", async () => {
    const epic = await createTask({
      projectKey,
      title: "Epic",
      type: "epic",
      orgId,
      userId,
    });

    const db = getTestDB();
    const rows = await db
      .select()
      .from(taskPositions)
      .where(eq(taskPositions.task_id, epic.task_id));

    expect(rows).toHaveLength(0);
  });

  it("increments position for subsequent tasks", async () => {
    const t1 = await createTask({ projectKey, title: "A", orgId, userId });
    const t2 = await createTask({ projectKey, title: "B", orgId, userId });

    const db = getTestDB();
    const [p1] = await db.select().from(taskPositions).where(eq(taskPositions.task_id, t1.task_id));
    const [p2] = await db.select().from(taskPositions).where(eq(taskPositions.task_id, t2.task_id));

    expect(p1.position).toBe(1000);
    expect(p2.position).toBe(2000);
  });

  it("deletes position on task delete", async () => {
    const task = await createTask({ projectKey, title: "Del", orgId, userId });

    await deleteTask(task.key, orgId, userId);

    const db = getTestDB();
    const rows = await db
      .select()
      .from(taskPositions)
      .where(eq(taskPositions.task_id, task.task_id));

    expect(rows).toHaveLength(0);
  });

  it("reorders task position", async () => {
    const task = await createTask({ projectKey, title: "Move", orgId, userId });

    await reorderTask(task.key, 500, orgId);

    const db = getTestDB();
    const [pos] = await db
      .select()
      .from(taskPositions)
      .where(eq(taskPositions.task_id, task.task_id));

    expect(pos.position).toBe(500);
  });

  it("list returns tasks ordered by position", async () => {
    const t1 = await createTask({ projectKey, title: "First", orgId, userId });
    const t2 = await createTask({ projectKey, title: "Second", orgId, userId });
    const t3 = await createTask({ projectKey, title: "Third", orgId, userId });

    // Reorder: t3 first, t1 second, t2 third
    await reorderTask(t3.key, 100, orgId);
    await reorderTask(t1.key, 200, orgId);
    await reorderTask(t2.key, 300, orgId);

    const result = await listTasks(projectId, orgId, { type: "task" });
    expect(result.data.map((t) => t.key)).toEqual([t3.key, t1.key, t2.key]);
  });

  it("list includes position in response", async () => {
    await createTask({ projectKey, title: "WithPos", orgId, userId });

    const result = await listTasks(projectId, orgId, { type: "task" });
    expect(result.data[0]).toHaveProperty("position");
    expect(typeof result.data[0].position).toBe("number");
  });
});
