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
  getTaskGraph,
} from "@/lib/services/tasks";

describe("task graph", () => {
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
      name: "Graph Project",
      key: "GRAPH",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("returns empty graph for empty project", async () => {
    const graph = await getTaskGraph(projectId, orgId);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("returns nodes without edges when no deps", async () => {
    await createTask({ projectKey, title: "A", orgId, userId });
    await createTask({ projectKey, title: "B", orgId, userId });

    const graph = await getTaskGraph(projectId, orgId);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(0);
  });

  it("returns nodes and edges with deps", async () => {
    const a = await createTask({ projectKey, title: "A", orgId, userId });
    const b = await createTask({ projectKey, title: "B", orgId, userId });
    const c = await createTask({ projectKey, title: "C", orgId, userId });

    await updateTaskDependencies(b.task_id, [a.task_id], orgId, projectId);
    await updateTaskDependencies(c.task_id, [a.task_id, b.task_id], orgId, projectId);

    const graph = await getTaskGraph(projectId, orgId);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(3);

    const edgePairs = graph.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgePairs).toContain(`${b.task_id}->${a.task_id}`);
    expect(edgePairs).toContain(`${c.task_id}->${a.task_id}`);
    expect(edgePairs).toContain(`${c.task_id}->${b.task_id}`);
  });

  it("includes epics in graph nodes", async () => {
    await createTask({ projectKey, title: "Task", orgId, userId });
    await createTask({ projectKey, title: "Epic", type: "epic", orgId, userId });

    const graph = await getTaskGraph(projectId, orgId);
    expect(graph.nodes).toHaveLength(2);
    const types = graph.nodes.map((n) => n.type);
    expect(types).toContain("task");
    expect(types).toContain("epic");
  });

  it("node shape includes expected fields", async () => {
    const task = await createTask({
      projectKey,
      title: "Shaped",
      orgId,
      userId,
    });

    const graph = await getTaskGraph(projectId, orgId);
    const node = graph.nodes[0];
    expect(node.task_id).toBe(task.task_id);
    expect(node.display_id).toBe(task.display_id);
    expect(node.title).toBe("Shaped");
    expect(node.type).toBe("task");
    expect(node.status).toBe("open");
    expect(node.priority).toBeNull();
  });
});
