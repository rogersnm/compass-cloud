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
    const { displayId } = await seedTask(
      baseURL ?? "http://localhost:3000",
      account.accessToken,
      account.orgSlug
    );

    await page.goto(`/${account.orgSlug}/tasks/${displayId}`);

    // Wait for the task title to confirm data loaded
    await expect(page.getByText("Migrate to OAuth 2.0 + PKCE")).toBeVisible({
      timeout: 15_000,
    });

    // The prose container wrapping the markdown
    const prose = page.locator(".prose");
    await expect(prose).toBeVisible();

    // --- Verify key markdown elements render as proper HTML ---

    // H2 heading
    await expect(prose.locator("h2", { hasText: "Overview" })).toBeVisible();

    // H3 headings
    await expect(
      prose.locator("h3", { hasText: "Requirements" })
    ).toBeVisible();
    await expect(
      prose.locator("h3", { hasText: "Technical Notes" })
    ).toBeVisible();

    // Ordered list items
    await expect(
      prose.locator("ol > li", { hasText: "authorization_code" })
    ).toBeVisible();

    // Bold text
    await expect(prose.locator("strong", { hasText: "migration" })).toBeVisible();

    // Inline code
    await expect(
      prose.locator("code", { hasText: "authorization_code" })
    ).toBeVisible();

    // Code block (fenced)
    await expect(prose.locator("pre code")).toBeVisible();
    await expect(
      prose.locator("pre code", { hasText: "token_endpoint" })
    ).toBeVisible();

    // Table (GFM)
    await expect(prose.locator("table")).toBeVisible();
    await expect(
      prose.locator("th", { hasText: "Complexity" })
    ).toBeVisible();
    await expect(
      prose.locator("td", { hasText: "Very High" })
    ).toBeVisible();

    // Blockquote
    await expect(prose.locator("blockquote")).toBeVisible();

    // Horizontal rule
    await expect(prose.locator("hr")).toBeVisible();

    // Strikethrough (GFM)
    await expect(prose.locator("del", { hasText: "old auth docs" })).toBeVisible();

    // Emphasis / italic
    await expect(prose.locator("em", { hasText: "required" })).toBeVisible();

    // --- Visual regression: check that prose styles are applied ---
    // If @tailwindcss/typography is not loaded, headings will have no
    // margin/size differentiation from body text.

    const h2 = prose.locator("h2", { hasText: "Overview" });
    const h2FontSize = await h2.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    // prose-sm h2 should be notably larger than base (14px). If typography
    // plugin is missing, it'll inherit the body size (~14px).
    expect(h2FontSize).toBeGreaterThanOrEqual(18);

    // Code block should have a background color (not transparent)
    const pre = prose.locator("pre").first();
    const preBg = await pre.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(preBg).not.toBe("rgba(0, 0, 0, 0)");

    // Table should have visible padding (typography uses paddingBottom on th)
    const th = prose.locator("th").first();
    const thPadding = await th.evaluate(
      (el) => parseFloat(getComputedStyle(el).paddingBottom)
    );
    expect(thPadding).toBeGreaterThan(0);

    // --- Screenshot the full task detail page ---
    await page.screenshot({
      path: "screenshots/task-markdown.png",
      fullPage: true,
    });

    // --- Screenshot just the markdown prose area ---
    await prose.screenshot({
      path: "screenshots/task-markdown-prose.png",
    });
  });
});
