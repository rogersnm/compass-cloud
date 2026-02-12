import { test } from "./fixtures";

test.describe("Screenshots", () => {
  test("capture splash screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "screenshots/splash.png",
      fullPage: true,
    });
  });

  test("capture login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "screenshots/login.png",
      fullPage: true,
    });
  });

  test("capture splash screen dark mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "screenshots/splash-dark.png",
      fullPage: true,
    });
  });
});
