import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject, getProjectByKey, deleteProject } from "@/lib/services/projects";
import {
  createTask,
  updateTask,
  getTaskByDisplayId,
  listTasks,
  updateTaskDependencies,
  getReadyTasks,
  getTaskGraph,
} from "@/lib/services/tasks";
import {
  createDocument,
  updateDocument,
  getDocumentByDisplayId,
} from "@/lib/services/documents";
import { search } from "@/lib/services/search";

describe("E2E workflow", () => {
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

  it("full project lifecycle: create, tasks, deps, docs, search, delete", async () => {
    // 1. Create project
    const project = await createProject({
      name: "Sprint Alpha",
      key: "ALPH",
      orgId,
      userId,
    });
    expect(project.key).toBe("ALPH");

    const projectKey = project.key;
    const projectId = project.project_id;

    // 2. Create tasks with dependencies
    const setup = await createTask({
      projectKey,
      title: "Set up environment",
      orgId,
      userId,
    });
    const backend = await createTask({
      projectKey,
      title: "Build backend API",
      orgId,
      userId,
    });
    const frontend = await createTask({
      projectKey,
      title: "Build frontend UI",
      orgId,
      userId,
    });
    const deploy = await createTask({
      projectKey,
      title: "Deploy to production",
      orgId,
      userId,
    });

    // Set up dependency chain: deploy -> (backend, frontend) -> setup
    await updateTaskDependencies(backend.task_id, [setup.task_id], orgId, projectId);
    await updateTaskDependencies(frontend.task_id, [setup.task_id], orgId, projectId);
    await updateTaskDependencies(deploy.task_id, [backend.task_id, frontend.task_id], orgId, projectId);

    // 3. Verify graph structure
    const graph = await getTaskGraph(projectId, orgId);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(4);

    // 4. Only setup should be ready
    let ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].task_id).toBe(setup.task_id);

    // 5. Work through the chain
    await updateTask(setup.display_id, { status: "in_progress" }, orgId, userId);
    await updateTask(setup.display_id, { status: "closed" }, orgId, userId);

    ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(2);
    const readyIds = ready.map((r) => r.task_id);
    expect(readyIds).toContain(backend.task_id);
    expect(readyIds).toContain(frontend.task_id);

    await updateTask(backend.display_id, { status: "closed" }, orgId, userId);
    await updateTask(frontend.display_id, { status: "closed" }, orgId, userId);

    ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(1);
    expect(ready[0].task_id).toBe(deploy.task_id);

    await updateTask(deploy.display_id, { status: "closed" }, orgId, userId);

    ready = await getReadyTasks(projectId, orgId);
    expect(ready).toHaveLength(0);

    // 6. Create and update a document
    const doc = await createDocument({
      projectKey,
      title: "Architecture Decision Record",
      body: "We chose Next.js for the API server.",
      orgId,
      userId,
    });
    expect(doc.version).toBe(1);

    const updatedDoc = await updateDocument(
      doc.display_id,
      { body: "We chose Next.js for the API server. Updated with deployment notes." },
      orgId,
      userId
    );
    expect(updatedDoc.version).toBe(2);

    // 7. Search finds items across types
    const searchResults = await search({ query: "API", orgId });
    expect(searchResults.length).toBeGreaterThanOrEqual(2); // backend task + doc

    const types = new Set(searchResults.map((r) => r.type));
    expect(types.has("task")).toBe(true);
    expect(types.has("document")).toBe(true);

    // 8. Project-scoped search
    const projectSearch = await search({
      query: "architecture",
      projectId,
      orgId,
    });
    expect(projectSearch.length).toBeGreaterThanOrEqual(1);

    // 9. List tasks shows correct counts
    const allTasks = await listTasks(projectId, orgId);
    expect(allTasks.data).toHaveLength(4);

    const closedTasks = await listTasks(projectId, orgId, { status: "closed" });
    expect(closedTasks.data).toHaveLength(4);

    // 10. Delete project cascades
    await deleteProject(projectKey, orgId, userId);

    await expect(
      getProjectByKey(projectKey, orgId)
    ).rejects.toThrow("Project not found");

    // Tasks and docs should be gone too
    await expect(
      getTaskByDisplayId(setup.display_id, orgId)
    ).rejects.toThrow("Task not found");

    await expect(
      getDocumentByDisplayId(doc.display_id, orgId)
    ).rejects.toThrow("Document not found");
  });

  it("multi-tenant isolation", async () => {
    // Create second org
    const user2 = await createTestUser({ email: "other@test.com" });
    const org2 = await createTestOrg({ slug: "other-org" });
    await createTestMember({
      organization_id: org2.organization_id,
      user_id: user2.user_id,
      role: "admin",
    });

    // Create project in each org with same key
    const p1 = await createProject({
      name: "Alpha",
      key: "ALPH",
      orgId,
      userId,
    });
    const p2 = await createProject({
      name: "Alpha",
      key: "ALPH",
      orgId: org2.organization_id,
      userId: user2.user_id,
    });

    // Tasks in org1
    await createTask({
      projectKey: p1.key,
      title: "Org1 secret task",
      orgId,
      userId,
    });

    // Tasks in org2
    await createTask({
      projectKey: p2.key,
      title: "Org2 secret task",
      orgId: org2.organization_id,
      userId: user2.user_id,
    });

    // Search in org1 should not see org2 tasks
    const results1 = await search({ query: "secret", orgId });
    expect(results1).toHaveLength(1);
    expect(results1[0].title).toBe("Org1 secret task");

    // Search in org2 should not see org1 tasks
    const results2 = await search({
      query: "secret",
      orgId: org2.organization_id,
    });
    expect(results2).toHaveLength(1);
    expect(results2[0].title).toBe("Org2 secret task");
  });
});
