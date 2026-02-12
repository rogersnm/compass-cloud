import { test, expect } from "./fixtures";

const API = "/api/v1";

async function apiPost(baseURL: string, path: string, body: object, token: string, orgSlug: string) {
  const res = await fetch(`${baseURL}${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

test.describe("Task list pagination", () => {
  test("shows open tasks and accumulates pages on Load More", async ({
    authedPage,
    account,
    baseURL,
  }) => {
    const base = baseURL ?? "http://localhost:3000";

    // Create a project
    const projRes = await apiPost(base, "/projects", {
      key: "PGN",
      name: "Pagination Test",
    }, account.accessToken, account.orgSlug);
    const projectKey = projRes.data.key;

    // Create 80 closed tasks and 1 open task
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 80; i++) {
      promises.push(
        apiPost(base, `/projects/${projectKey}/tasks`, {
          title: `Closed task ${i + 1}`,
          status: "closed",
          type: "task",
        }, account.accessToken, account.orgSlug)
      );
    }
    promises.push(
      apiPost(base, `/projects/${projectKey}/tasks`, {
        title: "The open task",
        status: "open",
        type: "task",
      }, account.accessToken, account.orgSlug)
    );
    await Promise.all(promises);

    // Navigate to project task list
    await authedPage.goto(`/${account.orgSlug}/projects/${projectKey}/tasks`);

    // The open task should be visible
    const openTask = authedPage.locator("text=The open task");
    await expect(openTask).toBeVisible({ timeout: 15000 });

    // The "Closed" section header should be visible (collapsible trigger contains the label)
    const closedHeader = authedPage.locator("button", { hasText: "Closed" });
    await expect(closedHeader).toBeVisible();

    // Count initial task rows visible (div-based rows with font-mono key)
    const taskRows = authedPage.locator("[class*='font-mono']").filter({ hasText: /^PGN-T/ });
    const initialCount = await taskRows.count();

    // Click Load More
    const loadMoreBtn = authedPage.locator("button", { hasText: "Load more" });
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();

    // Wait for more rows to appear
    await expect(async () => {
      const newCount = await taskRows.count();
      expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 10000 });
  });
});
