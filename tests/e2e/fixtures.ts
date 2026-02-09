import { test as base, expect, type Page } from "@playwright/test";

const API = "/api/v1";

/** Unique user credentials generated per test worker to avoid collisions. */
function testUser(workerId: string) {
  const id = `pw-${workerId}-${Date.now()}`;
  return {
    name: `Test User ${id}`,
    email: `${id}@test.local`,
    password: "password123",
    orgName: `Org ${id}`,
    orgSlug: `org-${id}`,
  };
}

export interface TestAccount {
  name: string;
  email: string;
  password: string;
  orgSlug: string;
  accessToken: string;
}

/**
 * Register a user via the API, then create an org with a separate call.
 * Does NOT touch localStorage; callers inject tokens into the browser.
 */
async function createAccount(
  baseURL: string,
  workerId: string
): Promise<TestAccount> {
  const u = testUser(workerId);

  // 1. Register (no org params)
  const regRes = await fetch(`${baseURL}${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: u.name,
      email: u.email,
      password: u.password,
    }),
  });
  if (!regRes.ok) {
    throw new Error(`Register failed: ${regRes.status} ${await regRes.text()}`);
  }
  const regJson = await regRes.json();
  const accessToken: string = regJson.data.access_token;

  // 2. Create org using the access token
  const orgRes = await fetch(`${baseURL}${API}/orgs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: u.orgName,
      slug: u.orgSlug,
    }),
  });
  if (!orgRes.ok) {
    throw new Error(`Create org failed: ${orgRes.status} ${await orgRes.text()}`);
  }

  return {
    name: u.name,
    email: u.email,
    password: u.password,
    orgSlug: u.orgSlug,
    accessToken,
  };
}

/**
 * Inject auth tokens into the browser so the SPA considers the user logged in.
 * Must be called before navigating to a protected route.
 */
async function injectAuth(page: Page, account: TestAccount) {
  await page.goto("/");
  await page.evaluate(
    ({ token, slug }) => {
      localStorage.setItem("compass_access_token", token);
      localStorage.setItem("compass_org_slug", slug);
    },
    { token: account.accessToken, slug: account.orgSlug }
  );
}

/**
 * Extended test fixtures:
 * - `account`: a fresh user + org, registered via the API
 * - `authedPage`: a page with auth tokens pre-injected
 */
export const test = base.extend<{
  account: TestAccount;
  authedPage: Page;
}>({
  account: async ({ baseURL }, use, testInfo) => {
    const acct = await createAccount(
      baseURL ?? "http://localhost:3000",
      String(testInfo.parallelIndex)
    );
    await use(acct);
  },
  authedPage: async ({ page, account }, use) => {
    await injectAuth(page, account);
    await use(page);
  },
});

export { expect };
