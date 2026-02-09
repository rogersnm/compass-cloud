import { test, expect } from "./fixtures";

test.describe("Registration", () => {
  test("registers a new user and redirects to dashboard", async ({
    page,
  }) => {
    const ts = Date.now();
    await page.goto("/register");

    await expect(
      page.locator("[data-slot='card-title']", { hasText: "Create account" })
    ).toBeVisible();

    await page.getByLabel("Name").fill(`Reg User ${ts}`);
    await page.getByLabel("Email").fill(`reg-${ts}@test.local`);
    await page.getByLabel("Password").fill("password123");

    await page.getByRole("button", { name: "Create account" }).click();

    // Should redirect to /dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your Organizations" })
    ).toBeVisible();
  });

  test("shows error for duplicate email", async ({ page, account }) => {
    await page.goto("/register");

    await page.getByLabel("Name").fill("Duplicate");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill("password123");

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("already registered")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Login", () => {
  test("logs in successfully and redirects to dashboard", async ({ page, account }) => {
    await page.goto("/login");

    await expect(
      page.locator("[data-slot='card-title']", { hasText: "Sign in" })
    ).toBeVisible();

    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);

    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect to /dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });
  });

  test("rejects wrong password", async ({ page, account }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill("wrong-password");

    await page.getByRole("button", { name: "Sign in" }).click();

    // Should remain on /login (not redirect to dashboard)
    await page.waitForTimeout(3_000);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Auth guard", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Clear any tokens
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await page.goto("/some-org");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
