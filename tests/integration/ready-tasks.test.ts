import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject } from "@/lib/services/projects";
import {
  createTask,
  updateTask,
  updateTaskDependencies,
  getReadyTasks,
} from "@/lib/services/tasks";

describe("ready tasks", () => {
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
      name: "Ready Project",
      key: "READY",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("returns all open tasks when no dependencies", async () => {
    await createTask({ projectKey, title: "A", orgId, userId });
    await createTask({ projectKey, title: "B", orgId, userId });
    await createTask({ projectKey, title: "C", orgId, userId });

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(3);
  });

  it("excludes closed tasks", async () => {
    await createTask({ projectKey, title: "Open", orgId, userId });
    const closed = await createTask({ projectKey, title: "Closed", orgId, userId });
    await updateTask(closed.key, { status: "closed" }, orgId, userId);

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].title).toBe("Open");
  });

  it("excludes blocked tasks", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].task_id).toBe(a.task_id);
  });

  it("unblocks task when dependency is closed", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);
    await updateTask(a.key, { status: "closed" }, orgId, userId);

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].task_id).toBe(b.task_id);
  });

  it("returns tasks in topological order", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });
    const c = await createTask({ projectKey, title: "C", orgId, userId });

    // C depends on B, B depends on A
    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);
    await updateTaskDependencies(c.task_id, [b.task_id], orgId, projectId);

    // Close A so B becomes ready, but C is still blocked by B
    await updateTask(a.key, { status: "closed" }, orgId, userId);

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].task_id).toBe(b.task_id);

    // Close B, now C is ready
    await updateTask(b.key, { status: "closed" }, orgId, userId);
    const ready2 = await getReadyTasks(projectId, orgId);
    expect(ready2).toHaveLength(1);
    expect(ready2[0].task_id).toBe(c.task_id);
  });

  it("excludes epics from ready list", async () => {
    await createTask({ projectKey, title: "Task", orgId, userId });
    await createTask({ projectKey, title: "Epic", type: "epic", orgId, userId });

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].title).toBe("Task");
  });

  it("includes in_progress tasks", async () => {
    const t = await createTask({ projectKey, title: "Started", orgId, userId });
    await updateTask(t.key, { status: "in_progress" }, orgId, userId);

    const ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].title).toBe("Started");
  });
});
