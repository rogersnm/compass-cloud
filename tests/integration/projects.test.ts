import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import {
  createProject,
  listProjects,
  getProjectByKey,
  deleteProject,
} from "@/lib/services/projects";
import { projects, tasks, documents } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("project CRUD", () => {
  let orgId: string;
  let userId: string;

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
  });

  it("creates project with auto-generated key", async () => {
    const project = await createProject({
      name: "Auth Service",
      orgId,
      userId,
    });

    expect(project.name).toBe("Auth Service");
    expect(project.key).toBe("AUTH");
    expect(project.version).toBe(1);
    expect(project.is_current).toBe(true);
  });

  it("creates project with explicit key", async () => {
    const project = await createProject({
      name: "My Project",
      key: "MYPR",
      orgId,
      userId,
    });

    expect(project.key).toBe("MYPR");
  });

  it("handles key collision by appending digit", async () => {
    await createProject({ name: "Auth Service", orgId, userId });

    const second = await createProject({
      name: "Authentication Module",
      orgId,
      userId,
    });

    // AUTH is taken, so should get AUTH2
    expect(second.key).toBe("AUTH2");
  });

  it("lists projects paginated", async () => {
    for (let i = 0; i < 3; i++) {
      await createProject({
        name: `Project ${i}`,
        key: `P${i}XX`,
        orgId,
        userId,
      });
    }

    const page1 = await listProjects(orgId, undefined, 2);
    expect(page1.data).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await listProjects(orgId, page1.nextCursor!, 2);
    expect(page2.data).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });

  it("gets project by key", async () => {
    await createProject({ name: "Find Me", key: "FIND", orgId, userId });

    const project = await getProjectByKey("FIND", orgId);
    expect(project.name).toBe("Find Me");
  });

  it("throws not found for missing project", async () => {
    await expect(
      getProjectByKey("NOPE", orgId)
    ).rejects.toThrow("Project not found");
  });

  it("deletes project and cascades to tasks and docs", async () => {
    const db = getTestDB();
    const project = await createProject({
      name: "Delete Me",
      key: "DEL",
      orgId,
      userId,
    });

    // Create a task and doc in this project
    await db.insert(tasks).values({
      organization_id: orgId,
      project_id: project.project_id,
      display_id: "DEL-T23456",
      title: "Test Task",
      created_by_user_id: userId,
    });

    await db.insert(documents).values({
      organization_id: orgId,
      project_id: project.project_id,
      display_id: "DEL-D23456",
      title: "Test Doc",
      created_by_user_id: userId,
    });

    await deleteProject("DEL", orgId, userId);

    // Verify project is soft-deleted
    const [proj] = await db
      .select()
      .from(projects)
      .where(eq(projects.project_id, project.project_id));
    expect(proj.deleted_at).not.toBeNull();

    // Verify task is soft-deleted
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.display_id, "DEL-T23456"));
    expect(task.deleted_at).not.toBeNull();

    // Verify doc is soft-deleted
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.display_id, "DEL-D23456"));
    expect(doc.deleted_at).not.toBeNull();
  });
});
