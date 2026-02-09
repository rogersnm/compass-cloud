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
  createDocument,
  listDocuments,
  getDocumentByDisplayId,
  updateDocument,
  deleteDocument,
} from "@/lib/services/documents";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("document CRUD", () => {
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
      name: "Docs Project",
      key: "DOCS",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("creates document with defaults", async () => {
    const doc = await createDocument({
      projectKey,
      title: "My Doc",
      orgId,
      userId,
    });

    expect(doc.title).toBe("My Doc");
    expect(doc.body).toBe("");
    expect(doc.version).toBe(1);
    expect(doc.is_current).toBe(true);
    expect(doc.key).toMatch(new RegExp(`^${projectKey}-D`));
  });

  it("creates document with body", async () => {
    const doc = await createDocument({
      projectKey,
      title: "With Body",
      body: "Some content here",
      orgId,
      userId,
    });

    expect(doc.title).toBe("With Body");
    expect(doc.body).toBe("Some content here");
  });

  it("gets document by display_id", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Lookup Test",
      orgId,
      userId,
    });

    const found = await getDocumentByDisplayId(doc.key, orgId);
    expect(found.document_id).toBe(doc.document_id);
    expect(found.title).toBe("Lookup Test");
  });

  it("throws on missing document", async () => {
    await expect(
      getDocumentByDisplayId("DOCS-DZZZZZ", orgId)
    ).rejects.toThrow("Document not found");
  });

  it("updates document title (creates new version)", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Original",
      orgId,
      userId,
    });

    const updated = await updateDocument(
      doc.key,
      { title: "Updated" },
      orgId,
      userId
    );

    expect(updated.title).toBe("Updated");
    expect(updated.version).toBe(2);
    expect(updated.is_current).toBe(true);
    expect(updated.document_id).toBe(doc.document_id);

    // Old version should not be current
    const db = getTestDB();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.document_id, doc.document_id));
    const old = rows.find((r) => r.version === 1);
    expect(old!.is_current).toBe(false);
  });

  it("updates document body", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Body Update",
      body: "old",
      orgId,
      userId,
    });

    const updated = await updateDocument(
      doc.key,
      { body: "new content" },
      orgId,
      userId
    );

    expect(updated.body).toBe("new content");
    expect(updated.title).toBe("Body Update"); // unchanged
  });

  it("deletes document (final version with deleted_at)", async () => {
    const doc = await createDocument({
      projectKey,
      title: "Delete Me",
      orgId,
      userId,
    });

    await deleteDocument(doc.key, orgId, userId);

    await expect(
      getDocumentByDisplayId(doc.key, orgId)
    ).rejects.toThrow("Document not found");

    // But the rows still exist in DB
    const db = getTestDB();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.document_id, doc.document_id));
    expect(rows).toHaveLength(2); // version 1 + deleted version 2
    expect(rows[1].deleted_at).not.toBeNull();
  });

  it("lists documents with pagination", async () => {
    await createDocument({ projectKey, title: "Doc 1", orgId, userId });
    await createDocument({ projectKey, title: "Doc 2", orgId, userId });
    await createDocument({ projectKey, title: "Doc 3", orgId, userId });

    // All docs
    const all = await listDocuments(projectId, orgId);
    expect(all.data).toHaveLength(3);

    // Paginated
    const page1 = await listDocuments(projectId, orgId, { limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await listDocuments(projectId, orgId, {
      limit: 2,
      cursor: page1.nextCursor!,
    });
    expect(page2.data).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });
});
