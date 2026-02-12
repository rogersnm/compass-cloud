import { test, expect } from "./fixtures";

const API = "/api/v1";

/** Rich markdown body exercising headings, lists, code, tables, and emphasis. */
const MARKDOWN_BODY = `## Overview

This task covers the **migration** of the legacy authentication system to OAuth 2.0.

### Requirements

1. Support \`authorization_code\` grant type
2. Implement PKCE flow for public clients
3. Token refresh with sliding expiration

### Acceptance Criteria

- [ ] Users can log in via OAuth
- [ ] Refresh tokens rotate on use
- [x] Legacy sessions are invalidated

### Technical Notes

Use the following configuration:

\`\`\`json
{
  "issuer": "https://auth.example.com",
  "token_endpoint": "/oauth/token",
  "scopes": ["openid", "profile", "email"]
}
\`\`\`

### Comparison

| Approach | Complexity | Security |
|----------|------------|----------|
| Session cookies | Low | Medium |
| JWT + refresh | Medium | High |
| OAuth 2.0 + PKCE | High | Very High |

> **Note**: PKCE is *required* for all public clients per [RFC 7636](https://tools.ietf.org/html/rfc7636).

---

See also: ~~old auth docs~~ (deprecated).
`;

/** Create a project and task via the API, return the task display_id. */
async function seedTask(
  baseURL: string,
  token: string,
  orgSlug: string
): Promise<{ projectKey: string; displayId: string }> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Org-Slug": orgSlug,
  };

  // Create project
  const projRes = await fetch(`${baseURL}${API}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Markdown Test Project" }),
  });
  if (!projRes.ok) throw new Error(`Create project failed: ${projRes.status}`);
  const proj = await projRes.json();
  const projectKey = proj.data.key as string;

  // Create task with rich markdown body
  const taskRes = await fetch(`${baseURL}${API}/projects/${projectKey}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Migrate to OAuth 2.0 + PKCE",
      body: MARKDOWN_BODY,
      priority: 2,
    }),
  });
  if (!taskRes.ok) throw new Error(`Create task failed: ${taskRes.status}`);
  const task = await taskRes.json();

  return { projectKey, displayId: task.data.key as string };
}

test.describe("Task markdown rendering", () => {
  test("renders rich markdown correctly and screenshots", async ({
    authedPage: page,
    account,
    baseURL,
  }) => {
    const { projectKey, displayId } = await seedTask(
      baseURL ?? "http://localhost:3000",
      account.accessToken,
      account.orgSlug
    );

    await page.goto(`/${account.orgSlug}/projects/${projectKey}/tasks/${displayId}`);

    // Wait for the task title to confirm data loaded
    await expect(page.getByText("Migrate to OAuth 2.0 + PKCE")).toBeVisible({
      timeout: 15_000,
    });

    // The container wrapping the markdown
    const container = page.locator(".vscode-markdown");
    await expect(container).toBeVisible();

    // --- Verify key markdown elements render as proper HTML ---

    // H2 heading
    await expect(container.locator("h2", { hasText: "Overview" })).toBeVisible();

    // H3 headings
    await expect(
      container.locator("h3", { hasText: "Requirements" })
    ).toBeVisible();
    await expect(
      container.locator("h3", { hasText: "Technical Notes" })
    ).toBeVisible();

    // Ordered list items
    await expect(
      container.locator("ol > li", { hasText: "authorization_code" })
    ).toBeVisible();

    // Bold text
    await expect(container.locator("strong", { hasText: "migration" })).toBeVisible();

    // Inline code
    await expect(
      container.locator("code", { hasText: "authorization_code" })
    ).toBeVisible();

    // Code block (fenced)
    await expect(container.locator("pre code")).toBeVisible();
    await expect(
      container.locator("pre code", { hasText: "token_endpoint" })
    ).toBeVisible();

    // Table (GFM)
    await expect(container.locator("table")).toBeVisible();
    await expect(
      container.locator("th", { hasText: "Complexity" })
    ).toBeVisible();
    await expect(
      container.locator("td", { hasText: "Very High" })
    ).toBeVisible();

    // Blockquote
    await expect(container.locator("blockquote")).toBeVisible();

    // Horizontal rule
    await expect(container.locator("hr")).toBeVisible();

    // Strikethrough (GFM)
    await expect(container.locator("s", { hasText: "old auth docs" })).toBeVisible();

    // Emphasis / italic
    await expect(container.locator("em", { hasText: "required" })).toBeVisible();

    // --- Visual regression: VS Code styling applied ---

    const h2 = container.locator("h2", { hasText: "Overview" });
    const h2FontSize = await h2.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    // VS Code CSS sets h2 to 1.5em of 14px = 21px
    expect(h2FontSize).toBeGreaterThanOrEqual(18);

    // H2 should have a bottom border (signature VS Code look)
    const h2BorderWidth = await h2.evaluate(
      (el) => parseFloat(getComputedStyle(el).borderBottomWidth)
    );
    expect(h2BorderWidth).toBeGreaterThanOrEqual(1);

    // Code block should have a background color (not transparent)
    const pre = container.locator("pre").first();
    const preBg = await pre.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(preBg).not.toBe("rgba(0, 0, 0, 0)");

    // Table should have visible padding
    const th = container.locator("th").first();
    const thPadding = await th.evaluate(
      (el) => parseFloat(getComputedStyle(el).paddingBottom)
    );
    expect(thPadding).toBeGreaterThan(0);

    // Blockquote should have a left border
    const bq = container.locator("blockquote").first();
    const bqBorderLeft = await bq.evaluate(
      (el) => parseFloat(getComputedStyle(el).borderLeftWidth)
    );
    expect(bqBorderLeft).toBeGreaterThanOrEqual(4);

    // Syntax highlighting classes present on code blocks
    await expect(container.locator("pre code .hljs-string").first()).toBeVisible();

    // --- Screenshot the full task detail page ---
    await page.screenshot({
      path: "screenshots/task-markdown.png",
      fullPage: true,
    });

    // --- Screenshot just the markdown area (light mode) ---
    await container.screenshot({
      path: "screenshots/task-markdown-prose.png",
    });

    // --- Dark mode variant ---
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(200);

    // Dark mode should change code block background
    const preBgDark = await pre.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(preBgDark).not.toBe("rgba(0, 0, 0, 0)");
    expect(preBgDark).not.toBe(preBg);

    // Dark mode h2 border should use light color
    const h2BorderDark = await h2.evaluate(
      (el) => getComputedStyle(el).borderBottomColor
    );
    expect(h2BorderDark).toContain("rgba(255, 255, 255");

    await container.screenshot({
      path: "screenshots/task-markdown-prose-dark.png",
    });
  });
});
