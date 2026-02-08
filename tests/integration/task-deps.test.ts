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
  updateTaskDependencies,
  getTaskDependencies,
  isBlocked,
} from "@/lib/services/tasks";

describe("task dependencies", () => {
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
      name: "Deps Project",
      key: "DEPS",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("adds valid dependency", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);

    const deps = await getTaskDependencies(b.task_id);
    expect(deps).toEqual([a.task_id]);
  });

  it("rejects cyclic dependency", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);

    await expect(
      updateTaskDependencies(a.task_id, [b.task_id], orgId, projectId)
    ).rejects.toThrow("Cycle detected");
  });

  it("rejects self-dependency", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });

    await expect(
      updateTaskDependencies(a.task_id, [a.task_id], orgId, projectId)
    ).rejects.toThrow("Task cannot depend on itself");
  });

  it("rejects dependency on epic", async () => {
    const epic = await createTask({
      projectKey,
      title: "Epic",
      type: "epic",
      orgId,
      userId,
    });
    const task = await createTask({ projectKey, title: "Task", orgId, userId });

    await expect(
      updateTaskDependencies(task.task_id, [epic.task_id], orgId, projectId)
    ).rejects.toThrow("Cannot depend on an epic");
  });

  it("rejects epic with dependencies", async () => {
    const task = await createTask({ projectKey, title: "Task", orgId, userId });
    const epic = await createTask({
      projectKey,
      title: "Epic",
      type: "epic",
      orgId,
      userId,
    });

    await expect(
      updateTaskDependencies(epic.task_id, [task.task_id], orgId, projectId)
    ).rejects.toThrow("Epics cannot have dependencies");
  });

  it("computes blocked when dependency open", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);

    const statusMap = new Map([
      [a.task_id, "open"],
      [b.task_id, "open"],
    ]);

    expect(isBlocked(b.task_id, [a.task_id], statusMap)).toBe(true);
  });

  it("computes unblocked when dependency closed", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);

    const statusMap = new Map([
      [a.task_id, "closed"],
      [b.task_id, "open"],
    ]);

    expect(isBlocked(b.task_id, [a.task_id], statusMap)).toBe(false);
  });
});
