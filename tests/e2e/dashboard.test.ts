import { test, expect } from "./fixtures";

test.describe("Dashboard", () => {
  test("shows dashboard overview with project and task counts", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}`);

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Overview of your workspace")).toBeVisible();
    // Use card description locator to avoid strict mode (sidebar, button, etc. also contain "Projects")
    await expect(
      page.locator("[data-slot='card-description']", { hasText: "Projects" })
    ).toBeVisible();
    await expect(
      page.locator("[data-slot='card-description']", { hasText: "Open Tasks" })
    ).toBeVisible();
  });

  test("sidebar navigation works", async ({ authedPage: page, account }) => {
    await page.goto(`/${account.orgSlug}`);

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to Projects via sidebar (exact match to avoid "View Projects" button)
    await page
      .getByRole("link", { name: "Projects", exact: true })
      .click();
    await expect(page).toHaveURL(`/${account.orgSlug}/projects`);
    await expect(page.locator("h1", { hasText: "Projects" })).toBeVisible();

    // Navigate to Members via sidebar
    await page.getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(`/${account.orgSlug}/members`);

    // Navigate to Settings via sidebar
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(`/${account.orgSlug}/settings`);
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();

    // Navigate back to Dashboard via sidebar
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(`/${account.orgSlug}`);
  });

  test("view projects button navigates to projects page", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}`);

    await expect(page.getByText("View Projects")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("View Projects").click();
    await expect(page).toHaveURL(`/${account.orgSlug}/projects`);
  });
});
