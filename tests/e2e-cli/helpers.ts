import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_BASE = "http://localhost:3000/api/v1";
const COMPASS_SRC = join(process.env.HOME ?? "~", "git", "compass");

interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface CLIContext {
  dataDir: string;
  orgSlug: string;
  cleanup: () => Promise<void>;
  compass: (...args: string[]) => Promise<CLIResult>;
}

let compassBin: string | undefined;

/** Build the compass CLI once per test run, return path to the binary. */
export function buildCompass(destDir: string): string {
  if (compassBin) return compassBin;
  const bin = join(destDir, "compass");
  execFileSync("go", ["build", "-o", bin, "."], {
    cwd: COMPASS_SRC,
    timeout: 60000,
    stdio: "pipe",
  });
  compassBin = bin;
  return bin;
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

function runCompass(bin: string, dataDir: string, ...args: string[]): Promise<CLIResult> {
  return new Promise((resolve) => {
    execFile(
      bin,
      ["--data-dir", dataDir, ...args],
      {
        env: { ...process.env, COMPASS_API_BASE: API_BASE },
        timeout: 15000,
      },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: err?.code !== undefined ? (typeof err.code === "number" ? err.code : 1) : 0,
        });
      }
    );
  });
}

export async function bootstrapCLI(): Promise<CLIContext> {
  const id = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dataDir = await mkdtemp(join(tmpdir(), "compass-e2e-"));
  await mkdir(dataDir, { recursive: true });

  // Build CLI binary into temp dir
  const bin = buildCompass(dataDir);

  // 1. Register
  const regResult = await apiPost("/auth/register", {
    name: `E2E User ${id}`,
    email: `${id}@test.local`,
    password: "password123",
  });
  const accessToken = (regResult.data as { data: { access_token: string } }).data.access_token;

  // 2. Create org
  const orgSlug = `e2e-${id}`;
  await apiPost(
    "/orgs",
    { name: `E2E Org ${id}`, slug: orgSlug },
    { Authorization: `Bearer ${accessToken}` }
  );

  // 3. Create API key
  const keyResult = await apiPost(
    "/auth/keys",
    { name: "e2e-test-key" },
    { Authorization: `Bearer ${accessToken}`, "X-Org-Slug": orgSlug }
  );
  const apiKey = (keyResult.data as { data: { key: string } }).data.key;

  // 4. Write config.yaml to temp dir
  await writeFile(
    join(dataDir, "config.yaml"),
    `cloud:\n    api_key: ${apiKey}\n`
  );

  const compass = (...args: string[]) => runCompass(bin, dataDir, ...args);

  const cleanup = async () => {
    await rm(dataDir, { recursive: true, force: true });
  };

  return { dataDir, orgSlug, cleanup, compass };
}
