import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { createProject } from "@/lib/services/projects";
import { createTask } from "@/lib/services/tasks";
import { createDocument } from "@/lib/services/documents";
import { search } from "@/lib/services/search";

describe("cross-entity search", () => {
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
      name: "Search Project",
      key: "SRCH",
      orgId,
      userId,
    });
    projectId = project.project_id;
    projectKey = project.key;
  });

  it("finds tasks by title", async () => {
    await createTask({ projectKey, title: "Fix login bug", orgId, userId });
    await createTask({ projectKey, title: "Add signup", orgId, userId });

    const results = await search({ query: "login", orgId });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("task");
    expect(results[0].title).toBe("Fix login bug");
  });

  it("finds documents by body", async () => {
    await createDocument({
      projectKey,
      title: "Guide",
      body: "How to deploy the application",
      orgId,
      userId,
    });

    const results = await search({ query: "deploy", orgId });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("document");
  });

  it("finds projects by name", async () => {
    const results = await search({ query: "Search", orgId });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("project");
    expect(results[0].key).toBe("SRCH");
  });

  it("is case-insensitive", async () => {
    await createTask({ projectKey, title: "UPPERCASE TASK", orgId, userId });

    const results = await search({ query: "uppercase", orgId });
    expect(results).toHaveLength(1);
  });

  it("returns results across entity types", async () => {
    await createTask({ projectKey, title: "Auth task", orgId, userId });
    await createDocument({
      projectKey,
      title: "Auth docs",
      orgId,
      userId,
    });

    const results = await search({ query: "auth", orgId });
    expect(results).toHaveLength(2);
    const types = results.map((r) => r.type);
    expect(types).toContain("task");
    expect(types).toContain("document");
  });

  it("filters by project", async () => {
    const other = await createProject({
      name: "Other",
      key: "OTHR",
      orgId,
      userId,
    });
    await createTask({ projectKey, title: "Target item", orgId, userId });
    await createTask({ projectKey: other.key, title: "Target item", orgId, userId });

    const results = await search({
      query: "target",
      projectId,
      orgId,
    });
    // Only task from projectId, plus no projects (project search doesn't filter by projectId)
    const taskResults = results.filter((r) => r.type === "task");
    expect(taskResults).toHaveLength(1);
  });

  it("respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await createTask({ projectKey, title: `Item ${i}`, orgId, userId });
    }

    const results = await search({ query: "item", orgId, limit: 2 });
    expect(results).toHaveLength(2);
  });

  it("returns empty for no matches", async () => {
    const results = await search({ query: "nonexistent", orgId });
    expect(results).toHaveLength(0);
  });
});
