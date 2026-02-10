import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const API = "/api/v1";

async function createTask(
  baseURL: string,
  token: string,
  orgSlug: string,
  projectKey: string,
  title: string,
  status?: string
) {
  const res = await fetch(`${baseURL}${API}/projects/${projectKey}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({ title, status }),
  });
  if (!res.ok) throw new Error(`Create task failed: ${res.status}`);
  return (await res.json()).data;
}

async function createProject(
  baseURL: string,
  token: string,
  orgSlug: string,
  name: string
) {
  const res = await fetch(`${baseURL}${API}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Create project failed: ${res.status}`);
  return (await res.json()).data;
}

/**
 * dnd-kit uses PointerSensor, not native HTML drag events.
 * Playwright's dragTo() dispatches native drag events, which dnd-kit ignores.
 * We need to simulate pointer events manually.
 */
async function dndkitDrag(page: Page, source: string, target: string) {
  const sourceEl = page.getByText(source);
  const targetEl = page.getByText(target);

  const sourceBox = await sourceEl.boundingBox();
  const targetBox = await targetEl.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Could not find element bounds");

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  // dnd-kit's PointerSensor has a 5px activation distance
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Move past activation threshold
  await page.mouse.move(sx, sy + 10, { steps: 3 });
  // Move to target
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe("Kanban Board", () => {
  test("board tab renders 3 columns with correct task counts", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    const project = await createProject(
      baseURL!,
      account.accessToken,
      account.orgSlug,
      "Kanban Test"
    );

    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "Open Task 1");
    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "Open Task 2");
    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "WIP Task", "in_progress");
    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "Done Task", "closed");

    await page.goto(`/${account.orgSlug}/projects/${project.key}`);
    await page.getByRole("tab", { name: "Board" }).click();

    // Use heading role to target column headers specifically
    await expect(page.getByRole("heading", { name: "Open" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Closed" })).toBeVisible();

    // Verify task cards are visible
    await expect(page.getByText("Open Task 1")).toBeVisible();
    await expect(page.getByText("Open Task 2")).toBeVisible();
    await expect(page.getByText("WIP Task")).toBeVisible();
    await expect(page.getByText("Done Task")).toBeVisible();
  });

  test("board renders task cards with titles", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    const project = await createProject(
      baseURL!,
      account.accessToken,
      account.orgSlug,
      "Card Test"
    );

    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "My Kanban Task");

    await page.goto(`/${account.orgSlug}/projects/${project.key}`);
    await page.getByRole("tab", { name: "Board" }).click();

    await expect(page.getByText("My Kanban Task")).toBeVisible({ timeout: 10_000 });
  });

  test("drag card between columns changes status", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    const project = await createProject(
      baseURL!,
      account.accessToken,
      account.orgSlug,
      "Drag Test"
    );

    const task = await createTask(
      baseURL!,
      account.accessToken,
      account.orgSlug,
      project.key,
      "Drag Me"
    );

    await page.goto(`/${account.orgSlug}/projects/${project.key}`);
    await page.getByRole("tab", { name: "Board" }).click();

    await expect(page.getByText("Drag Me")).toBeVisible({ timeout: 10_000 });

    // Drag from Open to In Progress column header
    await dndkitDrag(page, "Drag Me", "In Progress");

    // Wait for API calls to settle
    await page.waitForTimeout(2000);

    // Verify the task status changed via API
    const res = await fetch(`${baseURL}${API}/tasks/${task.key}`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "X-Org-Slug": account.orgSlug,
      },
    });
    const updated = (await res.json()).data;
    expect(updated.status).toBe("in_progress");
  });

  test("drag card within column reorders and persists", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    const project = await createProject(
      baseURL!,
      account.accessToken,
      account.orgSlug,
      "Reorder Test"
    );

    const task1 = await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "First Task");
    await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "Second Task");
    const task3 = await createTask(baseURL!, account.accessToken, account.orgSlug, project.key, "Third Task");

    await page.goto(`/${account.orgSlug}/projects/${project.key}`);
    await page.getByRole("tab", { name: "Board" }).click();

    await expect(page.getByText("First Task")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Third Task")).toBeVisible();

    // Drag "Third Task" above "First Task"
    await dndkitDrag(page, "Third Task", "First Task");

    await page.waitForTimeout(2000);

    // Verify order changed via API
    const res = await fetch(
      `${baseURL}${API}/projects/${project.key}/tasks?type=task&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "X-Org-Slug": account.orgSlug,
        },
      }
    );
    const tasks = (await res.json()).data;
    const openTasks = tasks.filter((t: { status: string }) => t.status === "open");

    const thirdPos = openTasks.find((t: { key: string }) => t.key === task3.key)?.position;
    const firstPos = openTasks.find((t: { key: string }) => t.key === task1.key)?.position;
    expect(thirdPos).toBeLessThan(firstPos);
  });
});
