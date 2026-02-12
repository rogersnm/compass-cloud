import { test, expect } from "./fixtures";

test.describe("Settings page", () => {
  test("shows org settings and API keys sections", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}/settings`);

    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Organization" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "API Keys" })
    ).toBeVisible();
  });

  test("org name field is pre-filled", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto(`/${account.orgSlug}/settings`);

    const nameInput = page.getByLabel("Organization Name");
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await expect(nameInput).not.toHaveValue("");
  });

  test("create and view API key", async ({ authedPage: page, account }) => {
    await page.goto(`/${account.orgSlug}/settings`);

    await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible({ timeout: 10_000 });

    // Click the "Create API Key" button (not the dialog heading)
    await page.getByRole("button", { name: "Create API Key" }).click();

    // Wait for dialog to open, then fill form
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Key Name").fill("Test Key");
    await page.getByRole("button", { name: "Create Key" }).click();

    // Should show the key with copy button
    await expect(
      page.getByRole("button", { name: "Copy" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("This key will only be shown once")
    ).toBeVisible();

    // Close the dialog
    await page.getByRole("button", { name: "Done" }).click();

    // Key should appear in the table
    await expect(page.getByText("Test Key")).toBeVisible();
  });
});
