import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText(
      "Track tasks and documents"
    );

    await expect(page.locator("nav")).toContainText("Sign in");
    await expect(page.locator("nav")).toContainText("Get Started");
  });

  test("renders feature cards", async ({ page }) => {
    await page.goto("/");

    const cardTitles = page.locator("[data-slot='card-title']");
    await expect(cardTitles).toHaveCount(4);
    await expect(cardTitles.nth(0)).toContainText("Version History");
    await expect(cardTitles.nth(1)).toContainText("Task Dependencies");
    await expect(cardTitles.nth(2)).toContainText("Multi-Org Support");
    await expect(cardTitles.nth(3)).toContainText("CLI-First Workflow");
  });

  test("sign in link navigates to login", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Sign in").click();
    await expect(page).toHaveURL("/login");
  });

  test("get started link navigates to register", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Get Started").click();
    await expect(page).toHaveURL("/register");
  });
});
