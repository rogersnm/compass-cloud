import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject } from "@/lib/services/projects";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
} from "@/lib/services/documents";

describe("document version history", () => {
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
    projectKey = "DVER";
    await createProject({ name: "Doc Versions", key: projectKey, orgId, userId });
  });

  it("returns single version for a new document", async () => {
    const doc = await createDocument({
      projectKey,
      title: "New Doc",
      orgId,
      userId,
    });
    const versions = await getDocumentVersions(doc.key, orgId);

    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].title).toBe("New Doc");
    expect(versions[0].is_current).toBe(true);
  });

  it("returns all versions after updates, newest first", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Draft",
      body: "first",
      orgId,
      userId,
    });
    await updateDocument(doc.key, { title: "Revised" }, orgId, userId);
    await updateDocument(doc.key, { body: "final content" }, orgId, userId);

    const versions = await getDocumentVersions(doc.key, orgId);

    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe(3);
    expect(versions[0].body).toBe("final content");
    expect(versions[0].is_current).toBe(true);
    expect(versions[1].version).toBe(2);
    expect(versions[1].title).toBe("Revised");
    expect(versions[1].is_current).toBe(false);
    expect(versions[2].version).toBe(1);
    expect(versions[2].title).toBe("Draft");
    expect(versions[2].is_current).toBe(false);
  });

  it("includes deleted version after soft delete", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Deletable",
      orgId,
      userId,
    });
    await updateDocument(doc.key, { title: "Before Delete" }, orgId, userId);
    await deleteDocument(doc.key, orgId, userId);

    const versions = await getDocumentVersions(doc.key, orgId);

    expect(versions.length).toBeGreaterThanOrEqual(2);
    const deletedVersions = versions.filter((v) => v.deleted_at !== null);
    expect(deletedVersions.length).toBeGreaterThan(0);
  });

  it("throws not found for nonexistent display id", async () => {
    await expect(
      getDocumentVersions("DVER-D99999", orgId)
    ).rejects.toThrow("Document not found");
  });
});
