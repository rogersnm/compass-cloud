import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText(
      "Project tracking"
    );

    await expect(page.locator("nav")).toContainText("Sign in");
    await expect(page.locator("nav")).toContainText("Get Started");

    await page.screenshot({
      path: "screenshots/landing-hero.png",
      fullPage: false,
    });
  });

  test("renders feature cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cardTitles = page.locator("[data-slot='card-title']");
    await expect(cardTitles).toHaveCount(4);
    await expect(cardTitles.nth(0)).toContainText("Version History");
    await expect(cardTitles.nth(1)).toContainText("Task Dependencies");
    await expect(cardTitles.nth(2)).toContainText("Multi-Org Support");
    await expect(cardTitles.nth(3)).toContainText("CLI-First Workflow");

    await page.screenshot({
      path: "screenshots/landing-full.png",
      fullPage: true,
    });
  });

  test("sign in link navigates to login", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Sign in").click();
    await expect(page).toHaveURL("/login");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "screenshots/login.png",
      fullPage: true,
    });
  });

  test("get started link navigates to register", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Get Started").click();
    await expect(page).toHaveURL("/register");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "screenshots/register.png",
      fullPage: true,
    });
  });
});
