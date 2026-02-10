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
    await authedPage.goto(`/${account.orgSlug}/projects/${projectKey}`);

    // The "Open" section should be visible with the open task
    const openSection = authedPage.locator("text=The open task");
    await expect(openSection).toBeVisible({ timeout: 15000 });

    // The "Closed" section header should be visible
    const closedHeader = authedPage.locator("h3", { hasText: "Closed" });
    await expect(closedHeader).toBeVisible();

    // Count initial closed tasks visible
    const initialRows = await authedPage.locator("table tbody tr").count();

    // Click Load More
    const loadMoreBtn = authedPage.locator("button", { hasText: "Load more" });
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();

    // Wait for more rows to appear
    await expect(async () => {
      const newCount = await authedPage.locator("table tbody tr").count();
      expect(newCount).toBeGreaterThan(initialRows);
    }).toPass({ timeout: 10000 });
  });
});
