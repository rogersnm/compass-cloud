import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectVersions,
} from "@/lib/services/projects";

describe("project version history", () => {
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

  it("returns single version for a new project", async () => {
    await createProject({ name: "Fresh", key: "FRSH", orgId, userId });
    const versions = await getProjectVersions("FRSH", orgId);

    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].name).toBe("Fresh");
    expect(versions[0].is_current).toBe(true);
  });

  it("returns all versions after updates, newest first", async () => {
    await createProject({ name: "V1", key: "VERS", orgId, userId });
    await updateProject("VERS", { name: "V2" }, orgId, userId);
    await updateProject("VERS", { name: "V3", body: "third" }, orgId, userId);

    const versions = await getProjectVersions("VERS", orgId);

    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe(3);
    expect(versions[0].name).toBe("V3");
    expect(versions[0].is_current).toBe(true);
    expect(versions[1].version).toBe(2);
    expect(versions[1].name).toBe("V2");
    expect(versions[1].is_current).toBe(false);
    expect(versions[2].version).toBe(1);
    expect(versions[2].name).toBe("V1");
    expect(versions[2].is_current).toBe(false);
  });

  it("includes deleted version after soft delete", async () => {
    await createProject({ name: "ToDelete", key: "DEL", orgId, userId });
    await updateProject("DEL", { name: "Updated" }, orgId, userId);
    await deleteProject("DEL", orgId, userId);

    const versions = await getProjectVersions("DEL", orgId);

    expect(versions.length).toBeGreaterThanOrEqual(2);
    // The last version should have deleted_at set
    const deletedVersions = versions.filter((v) => v.deleted_at !== null);
    expect(deletedVersions.length).toBeGreaterThan(0);
  });

  it("throws not found for nonexistent project key", async () => {
    await expect(
      getProjectVersions("NOPE", orgId)
    ).rejects.toThrow("Project not found");
  });
});
