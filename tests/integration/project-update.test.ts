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
  updateProject,
  getProjectByKey,
} from "@/lib/services/projects";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

describe("project update (versioned)", () => {
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

  it("updates name only and creates new version", async () => {
    const original = await createProject({ name: "Old Name", key: "OLDN", orgId, userId });
    const updated = await updateProject("OLDN", { name: "New Name" }, orgId, userId);

    expect(updated.name).toBe("New Name");
    expect(updated.body).toBe(original.body);
    expect(updated.version).toBe(2);
    expect(updated.is_current).toBe(true);
    expect(updated.project_id).toBe(original.project_id);
  });

  it("updates body only", async () => {
    await createProject({ name: "My Project", key: "BODY", orgId, userId });
    const updated = await updateProject("BODY", { body: "new content" }, orgId, userId);

    expect(updated.body).toBe("new content");
    expect(updated.name).toBe("My Project");
    expect(updated.version).toBe(2);
  });

  it("updates both name and body", async () => {
    await createProject({ name: "Old", key: "BOTH", orgId, userId });
    const updated = await updateProject("BOTH", { name: "New", body: "new body" }, orgId, userId);

    expect(updated.name).toBe("New");
    expect(updated.body).toBe("new body");
    expect(updated.version).toBe(2);
  });

  it("marks old version as is_current = false", async () => {
    const db = getTestDB();
    const original = await createProject({ name: "Versioned", key: "VER", orgId, userId });
    await updateProject("VER", { name: "Updated" }, orgId, userId);

    const [oldRow] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.project_id, original.project_id),
          eq(projects.version, 1)
        )
      );

    expect(oldRow.is_current).toBe(false);
  });

  it("increments version on successive updates", async () => {
    await createProject({ name: "Multi", key: "MULT", orgId, userId });
    await updateProject("MULT", { name: "V2" }, orgId, userId);
    const v3 = await updateProject("MULT", { name: "V3" }, orgId, userId);

    expect(v3.version).toBe(3);
    expect(v3.name).toBe("V3");
  });

  it("getProjectByKey returns latest version after update", async () => {
    await createProject({ name: "Before", key: "LATR", orgId, userId });
    await updateProject("LATR", { name: "After" }, orgId, userId);

    const found = await getProjectByKey("LATR", orgId);
    expect(found.name).toBe("After");
    expect(found.version).toBe(2);
  });

  it("throws not found for nonexistent project key", async () => {
    await expect(
      updateProject("NOPE", { name: "X" }, orgId, userId)
    ).rejects.toThrow("Project not found");
  });
});
