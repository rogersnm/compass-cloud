import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject, getProjectByKey, listProjects, getProjectVersions, updateProject } from "@/lib/services/projects";
import { createTask, getTaskByDisplayId, listTasks, getTaskVersions, updateTask } from "@/lib/services/tasks";
import { createDocument, getDocumentByDisplayId, listDocuments, getDocumentVersions, updateDocument } from "@/lib/services/documents";

describe("created_by field", () => {
  let orgId: string;
  let userId: string;
  const userName = "Alice Builder";

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
    const user = await createTestUser({ name: userName });
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
      role: "admin",
    });
    orgId = org.organization_id;
    userId = user.user_id;
  });

  it("project create returns created_by", async () => {
    const project = await createProject({ name: "P1", key: "PROJ", orgId, userId });
    expect(project.created_by).toBe(userName);
  });

  it("project get returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const project = await getProjectByKey("PROJ", orgId);
    expect(project.created_by).toBe(userName);
  });

  it("project list returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const { data } = await listProjects(orgId);
    expect(data[0].created_by).toBe(userName);
  });

  it("project versions return created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    await updateProject("PROJ", { name: "P1 Updated" }, orgId, userId);
    const versions = await getProjectVersions("PROJ", orgId);
    for (const v of versions) {
      expect(v.created_by).toBe(userName);
    }
  });

  it("task create returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const task = await createTask({ projectKey: "PROJ", title: "T1", orgId, userId });
    expect(task.created_by).toBe(userName);
  });

  it("task get returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const task = await createTask({ projectKey: "PROJ", title: "T1", orgId, userId });
    const fetched = await getTaskByDisplayId(task.key, orgId);
    expect(fetched.created_by).toBe(userName);
  });

  it("task list returns created_by", async () => {
    const project = await createProject({ name: "P1", key: "PROJ", orgId, userId });
    await createTask({ projectKey: "PROJ", title: "T1", orgId, userId });
    const { data } = await listTasks(project.project_id, orgId);
    expect(data[0].created_by).toBe(userName);
  });

  it("task versions return created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const task = await createTask({ projectKey: "PROJ", title: "T1", orgId, userId });
    await updateTask(task.key, { title: "T1 Updated" }, orgId, userId);
    const versions = await getTaskVersions(task.key, orgId);
    for (const v of versions) {
      expect(v.created_by).toBe(userName);
    }
  });

  it("document create returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const doc = await createDocument({ projectKey: "PROJ", title: "D1", orgId, userId });
    expect(doc.created_by).toBe(userName);
  });

  it("document get returns created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const doc = await createDocument({ projectKey: "PROJ", title: "D1", orgId, userId });
    const fetched = await getDocumentByDisplayId(doc.key, orgId);
    expect(fetched.created_by).toBe(userName);
  });

  it("document list returns created_by", async () => {
    const project = await createProject({ name: "P1", key: "PROJ", orgId, userId });
    await createDocument({ projectKey: "PROJ", title: "D1", orgId, userId });
    const { data } = await listDocuments(project.project_id, orgId);
    expect(data[0].created_by).toBe(userName);
  });

  it("document versions return created_by", async () => {
    await createProject({ name: "P1", key: "PROJ", orgId, userId });
    const doc = await createDocument({ projectKey: "PROJ", title: "D1", orgId, userId });
    await updateDocument(doc.key, { body: "updated" }, orgId, userId);
    const versions = await getDocumentVersions(doc.key, orgId);
    for (const v of versions) {
      expect(v.created_by).toBe(userName);
    }
  });
});
