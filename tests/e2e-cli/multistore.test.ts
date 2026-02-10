import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { bootstrapMultistoreCLI } from "./helpers";

describe("compass CLI multistore e2e", () => {
  let compass: (...args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  let cleanup: () => Promise<void>;
  let dataDir: string;
  let apiKey: string;

  // Entity keys captured during tests
  let localTask: string;
  let cloudTask: string;

  beforeAll(async () => {
    const ctx = await bootstrapMultistoreCLI();
    compass = ctx.compass;
    cleanup = ctx.cleanup;
    dataDir = ctx.dataDir;
    apiKey = ctx.apiKey;
  });

  afterAll(async () => {
    await cleanup();
  });

  // ── Store Setup (via CLI) ──

  it("store add local", async () => {
    const r = await compass("store", "add", "local");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/local/i);
  });

  it("store add cloud with --api-key --protocol http", async () => {
    const r = await compass("store", "add", "localhost:3000", "--api-key", apiKey, "--protocol", "http");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/localhost:3000/);
  });

  it("store list shows both stores", async () => {
    const r = await compass("store", "list");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("local");
    expect(r.stdout).toContain("localhost:3000");
  });

  it("store set-default sets cloud as default", async () => {
    const r = await compass("store", "set-default", "localhost:3000");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/localhost:3000/);
  });

  // ── Local Project ──

  it("project create on local (--store local)", async () => {
    const r = await compass("project", "create", "Local Project", "--key", "LOC", "--store", "local");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("LOC");
  });

  it("task create on local project", async () => {
    const r = await compass("task", "create", "Local task one", "--project", "LOC");
    expect(r.exitCode).toBe(0);
    localTask = extractKey(r.stdout);
  });

  it("task show on local project routes correctly", async () => {
    const r = await compass("task", "show", localTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Local task one");
  });

  // ── Cloud Project ──

  it("project create on cloud (--store localhost:3000)", async () => {
    const r = await compass("project", "create", "Cloud Project", "--key", "CLD", "--store", "localhost:3000");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("CLD");
  });

  it("task create on cloud project", async () => {
    const r = await compass("task", "create", "Cloud task one", "--project", "CLD");
    expect(r.exitCode).toBe(0);
    cloudTask = extractKey(r.stdout);
  });

  it("task show on cloud project routes correctly", async () => {
    const r = await compass("task", "show", cloudTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Cloud task one");
  });

  // ── Cross-Store Isolation ──

  it("project list shows both with correct store column", async () => {
    const r = await compass("project", "list");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("LOC");
    expect(r.stdout).toContain("CLD");
    expect(r.stdout).toContain("local");
    expect(r.stdout).toContain("localhost:3000");
  });

  it("task list --project LOC doesn't show cloud tasks", async () => {
    const r = await compass("task", "list", "--project", "LOC");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Local task one");
    expect(r.stdout).not.toContain("Cloud task one");
  });

  it("task list --project CLD doesn't show local tasks", async () => {
    const r = await compass("task", "list", "--project", "CLD");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Cloud task one");
    expect(r.stdout).not.toContain("Local task one");
  });

  // ── Entity Routing ──

  it("task show with local entity ID hits local store", async () => {
    const r = await compass("task", "show", localTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Local task one");
  });

  it("task show with cloud entity ID hits cloud store", async () => {
    const r = await compass("task", "show", cloudTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Cloud task one");
  });

  // ── Task Download/Upload ──

  it("task download local task writes file", async () => {
    const r = await compass("task", "download", localTask);
    expect(r.exitCode).toBe(0);
    const content = await readFile(`${dataDir}/.compass/${localTask}.md`, "utf-8");
    expect(content).toContain("Local task one");
  });

  it("task upload local task sends edits back", async () => {
    const filePath = `${dataDir}/.compass/${localTask}.md`;
    const content = await readFile(filePath, "utf-8");
    await writeFile(filePath, content.replace("Local task one", "Local task updated"));
    const r = await compass("task", "upload", localTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Uploaded task");
    const show = await compass("task", "show", localTask);
    expect(show.stdout).toContain("Local task updated");
  });

  it("task download cloud task writes file", async () => {
    const r = await compass("task", "download", cloudTask);
    expect(r.exitCode).toBe(0);
    const content = await readFile(`${dataDir}/.compass/${cloudTask}.md`, "utf-8");
    expect(content).toContain("Cloud task one");
  });

  it("task upload cloud task sends edits back", async () => {
    const filePath = `${dataDir}/.compass/${cloudTask}.md`;
    const content = await readFile(filePath, "utf-8");
    await writeFile(filePath, content.replace("Cloud task one", "Cloud task updated"));
    const r = await compass("task", "upload", cloudTask);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Uploaded task");
    const show = await compass("task", "show", cloudTask);
    expect(show.stdout).toContain("Cloud task updated");
  });

  // ── Store Fetch ──

  it("store fetch --store local --all caches local projects", async () => {
    const r = await compass("store", "fetch", "--store", "local", "--all");
    expect(r.exitCode).toBe(0);
  });

  it("store fetch --all caches all projects from all stores", async () => {
    const r = await compass("store", "fetch", "--all");
    expect(r.exitCode).toBe(0);
  });

  // ── Search Fan-out ──

  it("search without --project returns results from both stores", async () => {
    const r = await compass("search", "task updated");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Local task updated");
    expect(r.stdout).toContain("Cloud task updated");
  });

  it("search with --project scopes to one store", async () => {
    const r = await compass("search", "task updated", "--project", "LOC");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("Local task updated");
    expect(r.stdout).not.toContain("Cloud task updated");
  });

  // ── Store Removal ──

  it("store remove local --force removes local store and prunes cache", async () => {
    const r = await compass("store", "remove", "local", "--force");
    expect(r.exitCode).toBe(0);
  });

  it("project list no longer shows local project", async () => {
    const r = await compass("project", "list");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).not.toContain("LOC");
    expect(r.stdout).toContain("CLD");
  });

  it("store list shows only cloud", async () => {
    const r = await compass("store", "list");
    expect(r.exitCode).toBe(0);
    // "local" as a standalone store entry should be gone, but "localhost:3000" remains
    const lines = r.stdout.split("\n");
    const localOnlyLine = lines.find((l) => /│local\s*│/.test(l) && !l.includes("localhost"));
    expect(localOnlyLine).toBeUndefined();
    expect(r.stdout).toContain("localhost:3000");
  });

  // ── Cleanup ──

  it("project delete cloud project", async () => {
    const r = await compass("project", "delete", "CLD", "--force");
    expect(r.exitCode).toBe(0);
  });
});

function extractKey(output: string): string {
  const match = output.match(/[A-Z0-9]+-[TE][A-Z0-9]+/);
  if (!match) throw new Error(`No task key found in output: ${output}`);
  return match[0];
}
