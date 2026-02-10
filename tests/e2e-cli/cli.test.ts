import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { bootstrapCLI } from "./helpers";

describe("compass CLI e2e", () => {
  let compass: (...args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  let cleanup: () => Promise<void>;
  let dataDir: string;

  // Epic keys
  let authEpic: string;
  let dbEpic: string;
  let infraEpic: string;

  // Auth epic tasks: login -> session -> oauth (linear chain)
  let loginTask: string;
  let sessionTask: string;
  let oauthTask: string;

  // DB epic tasks: schema -> migrations, schema -> seed (fan-out)
  let schemaTask: string;
  let migrationsTask: string;
  let seedTask: string;

  // Cross-epic: deploy depends on oauth + migrations (fan-in from both epics)
  let deployTask: string;

  beforeAll(async () => {
    const ctx = await bootstrapCLI();
    compass = ctx.compass;
    cleanup = ctx.cleanup;
    dataDir = ctx.dataDir;
  });

  afterAll(async () => {
    await cleanup();
  });

  // ── Setup ──

  it("config status shows authenticated", async () => {
    const r = await compass("config", "status");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/cloud/i);
  });

  it("project create", async () => {
    const r = await compass("project", "create", "E2E Test", "--key", "E2E");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/E2E/);
  });

  it("project show includes created_by", async () => {
    const r = await compass("project", "show", "E2E");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/created_by: E2E User/);
  });

  it("project list shows new project", async () => {
    const r = await compass("project", "list");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("E2E Test");
  });

  // ── Epics ──

  it("create auth epic", async () => {
    const r = await compass("task", "create", "Auth Epic", "--project", "E2E", "--type", "epic");
    expect(r.exitCode).toBe(0);
    authEpic = extractKey(r.stdout);
  });

  it("create db epic", async () => {
    const r = await compass("task", "create", "DB Epic", "--project", "E2E", "--type", "epic");
    expect(r.exitCode).toBe(0);
    dbEpic = extractKey(r.stdout);
    expect(dbEpic).not.toBe(authEpic);
  });

  // ── Sub-epic under auth epic ──

  it("create sub-epic under auth epic", async () => {
    const r = await compass("task", "create", "OAuth Infra", "--project", "E2E", "--type", "epic", "--parent-epic", authEpic);
    expect(r.exitCode).toBe(0);
    infraEpic = extractKey(r.stdout);
  });

  it("task show sub-epic displays parent epic", async () => {
    const r = await compass("task", "show", infraEpic);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain(authEpic);
  });

  it("task list --parent-epic shows sub-epic and tasks", async () => {
    const r = await compass("task", "list", "--project", "E2E", "--parent-epic", authEpic);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("OAuth Infra");
  });

  it("create task under sub-epic", async () => {
    const r = await compass("task", "create", "Token Rotation", "--project", "E2E", "--parent-epic", infraEpic);
    expect(r.exitCode).toBe(0);
  });

  it("task show sub-epic lists child task", async () => {
    const r = await compass("task", "show", infraEpic, "--pretty");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Token Rotation");
  });

  // ── Auth epic: linear chain ──

  it("create login task under auth epic", async () => {
    const r = await compass("task", "create", "Build login page", "--project", "E2E", "--parent-epic", authEpic);
    expect(r.exitCode).toBe(0);
    loginTask = extractKey(r.stdout);
  });

  // ── Task download/upload ──

  it("task download writes file to .compass/", async () => {
    const r = await compass("task", "download", loginTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toContain(`${loginTask}.md`);
    const content = await readFile(`${dataDir}/.compass/${loginTask}.md`, "utf-8");
    expect(content).toContain("Build login page");
    expect(content).toMatch(/created_by: E2E User/);
  });

  it("task upload sends edits back and removes local file", async () => {
    const filePath = `${dataDir}/.compass/${loginTask}.md`;
    const content = await readFile(filePath, "utf-8");
    await writeFile(filePath, content.replace("Build login page", "Build login page (updated)"));
    const r = await compass("task", "upload", loginTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Uploaded task");
    // Verify the update took effect
    const show = await compass("task", "show", loginTask);
    expect(show.stdout).toContain("Build login page (updated)");
  });

  it("create session task depending on login", async () => {
    const r = await compass(
      "task", "create", "Session management",
      "--project", "E2E", "--parent-epic", authEpic, "--depends-on", loginTask
    );
    expect(r.exitCode).toBe(0);
    sessionTask = extractKey(r.stdout);
  });

  it("create oauth task depending on session", async () => {
    const r = await compass(
      "task", "create", "OAuth2 provider",
      "--project", "E2E", "--parent-epic", authEpic, "--depends-on", sessionTask
    );
    expect(r.exitCode).toBe(0);
    oauthTask = extractKey(r.stdout);
  });

  // ── DB epic: fan-out (schema -> migrations, schema -> seed) ──

  it("create schema task under db epic", async () => {
    const r = await compass("task", "create", "Design schema", "--project", "E2E", "--parent-epic", dbEpic);
    expect(r.exitCode).toBe(0);
    schemaTask = extractKey(r.stdout);
  });

  it("create migrations task depending on schema", async () => {
    const r = await compass(
      "task", "create", "Write migrations",
      "--project", "E2E", "--parent-epic", dbEpic, "--depends-on", schemaTask
    );
    expect(r.exitCode).toBe(0);
    migrationsTask = extractKey(r.stdout);
  });

  it("create seed task depending on schema", async () => {
    const r = await compass(
      "task", "create", "Seed data",
      "--project", "E2E", "--parent-epic", dbEpic, "--depends-on", schemaTask
    );
    expect(r.exitCode).toBe(0);
    seedTask = extractKey(r.stdout);
  });

  // ── Cross-epic fan-in ──

  it("create deploy task depending on oauth + migrations", async () => {
    const r = await compass(
      "task", "create", "Deploy to prod",
      "--project", "E2E", "--depends-on", `${oauthTask},${migrationsTask}`
    );
    expect(r.exitCode).toBe(0);
    deployTask = extractKey(r.stdout);
  });

  // ── Epic membership ──

  it("task list --epic filters to auth epic only", async () => {
    const r = await compass("task", "list", "--project", "E2E", "--parent-epic", authEpic);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Build login page");
    expect(r.stdout).toContain("Session management");
    expect(r.stdout).toContain("OAuth2 provider");
    expect(r.stdout).not.toContain("Design schema");
    expect(r.stdout).not.toContain("Write migrations");
    expect(r.stdout).not.toContain("Seed data");
  });

  it("task list --epic filters to db epic only", async () => {
    const r = await compass("task", "list", "--project", "E2E", "--parent-epic", dbEpic);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Design schema");
    expect(r.stdout).toContain("Write migrations");
    expect(r.stdout).toContain("Seed data");
    expect(r.stdout).not.toContain("Build login page");
    expect(r.stdout).not.toContain("Session management");
    expect(r.stdout).not.toContain("OAuth2 provider");
  });

  it("task list --type epic shows only epics", async () => {
    const r = await compass("task", "list", "--project", "E2E", "--type", "epic");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Auth Epic");
    expect(r.stdout).toContain("DB Epic");
    expect(r.stdout).toContain("OAuth Infra");
    expect(r.stdout).not.toContain("Build login page");
    expect(r.stdout).not.toContain("Design schema");
  });

  it("task show includes epic and project", async () => {
    const r = await compass("task", "show", loginTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain(authEpic);
    expect(r.stdout).toMatch(/project: E2E/);
  });

  it("task show includes created_by", async () => {
    const r = await compass("task", "show", loginTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/created_by: E2E User/);
  });

  // ── Dependency graph ──

  it("task graph contains all dependency edges", async () => {
    const r = await compass("task", "graph", "--project", "E2E");
    expect(r.exitCode).toBe(0);
    // Linear chain
    expect(r.stdout).toContain(loginTask);
    expect(r.stdout).toContain(sessionTask);
    expect(r.stdout).toContain(oauthTask);
    // Fan-out
    expect(r.stdout).toContain(schemaTask);
    expect(r.stdout).toContain(migrationsTask);
    expect(r.stdout).toContain(seedTask);
    // Fan-in
    expect(r.stdout).toContain(deployTask);
  });

  it("task show displays dependencies", async () => {
    const r = await compass("task", "show", deployTask);
    expect(r.exitCode).toBe(0);
    // deploy depends on both oauth and migrations
    expect(r.stdout).toContain(oauthTask);
    expect(r.stdout).toContain(migrationsTask);
  });

  // ── Blocked status in task list ──

  it("blocked tasks are annotated in task list", async () => {
    const r = await compass("task", "list", "--project", "E2E");
    expect(r.exitCode).toBe(0);
    // sessionTask depends on loginTask which is open, so it should be blocked
    const sessionLine = r.stdout.split("\n").find((l) => l.includes("Session management"));
    expect(sessionLine).toBeTruthy();
    expect(sessionLine).toMatch(/blocked/i);
  });

  // ── Dependency chain: progressive unblocking ──

  it("ready --all shows only root tasks initially", async () => {
    const r = await compass("task", "ready", "--project", "E2E", "--all");
    expect(r.exitCode).toBe(0);
    // login and schema have no deps, so they're ready
    expect(r.stdout).toContain("Build login page");
    expect(r.stdout).toContain("Design schema");
    // blocked tasks should not appear
    expect(r.stdout).not.toContain("Session management");
    expect(r.stdout).not.toContain("Write migrations");
    expect(r.stdout).not.toContain("Deploy to prod");
  });

  it("close login task", async () => {
    const r = await compass("task", "close", loginTask);
    expect(r.exitCode).toBe(0);
  });

  it("session is now ready after login closed", async () => {
    const r = await compass("task", "ready", "--project", "E2E", "--all");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Session management");
    // oauth still blocked (depends on session)
    expect(r.stdout).not.toContain("OAuth2 provider");
  });

  it("close schema task unblocks both migrations and seed", async () => {
    await compass("task", "close", schemaTask);
    const r = await compass("task", "ready", "--project", "E2E", "--all");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Write migrations");
    expect(r.stdout).toContain("Seed data");
    // deploy still blocked (needs oauth + migrations)
    expect(r.stdout).not.toContain("Deploy to prod");
  });

  it("close session and oauth to progress auth chain", async () => {
    await compass("task", "close", sessionTask);
    await compass("task", "close", oauthTask);
    const r = await compass("task", "ready", "--project", "E2E", "--all");
    expect(r.exitCode).toBe(0);
    // deploy still blocked (migrations not closed)
    expect(r.stdout).not.toContain("Deploy to prod");
  });

  it("close migrations unblocks deploy (fan-in complete)", async () => {
    await compass("task", "close", migrationsTask);
    const r = await compass("task", "ready", "--project", "E2E", "--all");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Deploy to prod");
  });

  it("task list --status closed shows completed tasks", async () => {
    const r = await compass("task", "list", "--project", "E2E", "--status", "closed");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Build login page");
    expect(r.stdout).toContain("Session management");
    expect(r.stdout).toContain("OAuth2 provider");
    expect(r.stdout).toContain("Design schema");
    expect(r.stdout).toContain("Write migrations");
    expect(r.stdout).not.toContain("Seed data");
    expect(r.stdout).not.toContain("Deploy to prod");
  });

  // ── Cleanup ──

  it("project delete cleans up", async () => {
    const r = await compass("project", "delete", "E2E", "--force");
    expect(r.exitCode).toBe(0);
  });
});

/**
 * Extract a task key (e.g. "E2E-TKSHG6") from CLI output.
 * Keys are PROJECT-T<id> or PROJECT-E<id> where id is alphanumeric.
 */
function extractKey(output: string): string {
  const match = output.match(/[A-Z0-9]+-[TE][A-Z0-9]+/);
  if (!match) throw new Error(`No task key found in output: ${output}`);
  return match[0];
}
