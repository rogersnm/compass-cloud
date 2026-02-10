import { test, expect } from "./fixtures";

test.describe("Home Dashboard", () => {
  test("authenticated user sees org list", async ({ authedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Your Organizations" })
    ).toBeVisible({ timeout: 10_000 });

    // Should see the test org card
    await expect(page.getByText(/^org-/)).toBeVisible();
  });

  test("org card click navigates to org dashboard", async ({
    authedPage: page,
    account,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Your Organizations" })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByText(account.orgSlug).click();

    await expect(page).toHaveURL(`/${account.orgSlug}`, { timeout: 10_000 });
  });

  test("user with no orgs sees empty state", async ({ page, baseURL }) => {
    const ts = Date.now();
    // Register a user without creating an org
    const res = await fetch(`${baseURL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `No Org User ${ts}`,
        email: `no-org-${ts}@test.local`,
        password: "password123",
      }),
    });
    const json = await res.json();
    const token: string = json.data.access_token;

    // Inject auth without org slug
    await page.addInitScript(
      (t) => localStorage.setItem("compass_access_token", t),
      token
    );

    await page.goto("/dashboard");

    await expect(page.getByText("No organizations yet")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: "Create Organization" }).first()
    ).toBeVisible();
  });
});
