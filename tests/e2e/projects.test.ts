import { test, expect } from "./fixtures";

test.describe("Projects", () => {
  test("shows empty state when no projects exist", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}/projects`);

    await expect(page.getByText("No projects yet")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("creates a project via the dialog", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}/projects`);

    await page.getByRole("button", { name: "New Project" }).first().click();

    // Dialog title is "New Project"
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Name").fill("My Test Project");

    await page.getByRole("button", { name: "Create" }).click();

    // Project should appear in the list after the dialog closes
    await expect(page.getByText("My Test Project")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("navigates to project detail on row click", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    // Create a project via the API first
    const res = await fetch(`${baseURL}/api/v1/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
        "X-Org-Slug": account.orgSlug,
      },
      body: JSON.stringify({ name: "Nav Test Project" }),
    });
    const project = await res.json();
    const key = project.data.key;

    await page.goto(`/${account.orgSlug}/projects`);

    await expect(page.getByText("Nav Test Project")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Nav Test Project").click();

    await expect(page).toHaveURL(`/${account.orgSlug}/projects/${key}`);
  });
});
