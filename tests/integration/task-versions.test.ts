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
  deleteTask,
  getTaskVersions,
} from "@/lib/services/tasks";

describe("task version history", () => {
  let orgId: string;
  let userId: string;
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
    projectKey = "TVER";
    await createProject({ name: "Task Versions", key: projectKey, orgId, userId });
  });

  it("returns single version for a new task", async () => {
    const task = await createTask({
      projectKey,
      title: "New Task",
      orgId,
      userId,
    });
    const versions = await getTaskVersions(task.key, orgId);

    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].title).toBe("New Task");
    expect(versions[0].is_current).toBe(true);
  });

  it("returns all versions after updates, newest first", async () => {
    const task = await createTask({
      projectKey,
      title: "Original",
      orgId,
      userId,
    });
    await updateTask(task.key, { title: "Updated" }, orgId, userId);
    await updateTask(task.key, { title: "Final", status: "closed" }, orgId, userId);

    const versions = await getTaskVersions(task.key, orgId);

    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe(3);
    expect(versions[0].title).toBe("Final");
    expect(versions[0].status).toBe("closed");
    expect(versions[0].is_current).toBe(true);
    expect(versions[1].version).toBe(2);
    expect(versions[1].title).toBe("Updated");
    expect(versions[1].is_current).toBe(false);
    expect(versions[2].version).toBe(1);
    expect(versions[2].title).toBe("Original");
    expect(versions[2].is_current).toBe(false);
  });

  it("includes deleted version after soft delete", async () => {
    const task = await createTask({
      projectKey,
      title: "Deletable",
      orgId,
      userId,
    });
    await updateTask(task.key, { title: "Before Delete" }, orgId, userId);
    await deleteTask(task.key, orgId, userId);

    const versions = await getTaskVersions(task.key, orgId);

    expect(versions.length).toBeGreaterThanOrEqual(2);
    const deletedVersions = versions.filter((v) => v.deleted_at !== null);
    expect(deletedVersions.length).toBeGreaterThan(0);
  });

  it("throws not found for nonexistent display id", async () => {
    await expect(
      getTaskVersions("TVER-T99999", orgId)
    ).rejects.toThrow("Task not found");
  });
});
