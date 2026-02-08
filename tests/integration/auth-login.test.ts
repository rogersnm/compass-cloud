import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { users, refreshTokens } from "@/lib/db/schema";
import { hashPassword, comparePassword } from "@/lib/auth/passwords";
import { hashToken } from "@/lib/auth/tokens";
import { verifyToken } from "@/lib/auth/jwt";
import { eq } from "drizzle-orm";

describe("user login", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  async function createUser(email: string, password: string) {
    const db = getTestDB();
    const password_hash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, name: "Test User", password_hash })
      .returning();
    return user;
  }

  it("verifies password and returns tokens", async () => {
    const db = getTestDB();
    const user = await createUser("alice@test.com", "password123");

    const valid = await comparePassword("password123", user.password_hash);
    expect(valid).toBe(true);

    // Simulate what login does: create tokens and store refresh token
    const { signAccessToken } = await import(
      "@/lib/auth/jwt"
    );
    const { generateToken } = await import("@/lib/auth/tokens");

    const accessToken = signAccessToken({ userId: user.user_id });
    const rawRefreshToken = generateToken();
    const tokenHash = hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      user_id: user.user_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // Verify access token
    const payload = verifyToken(accessToken);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe(user.user_id);

    // Verify refresh token stored in DB
    const stored = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token_hash, tokenHash));
    expect(stored).toHaveLength(1);
    expect(stored[0].user_id).toBe(user.user_id);
  });

  it("rejects wrong password", async () => {
    const user = await createUser("bob@test.com", "correctpassword");
    const valid = await comparePassword("wrongpassword", user.password_hash);
    expect(valid).toBe(false);
  });

  it("handles non-existent user", async () => {
    const db = getTestDB();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, "nobody@test.com"));
    expect(result).toHaveLength(0);
  });
});
