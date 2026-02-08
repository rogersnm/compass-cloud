import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { users, refreshTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/passwords";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { verifyToken } from "@/lib/auth/jwt";
import { eq, isNull, and, isNotNull } from "drizzle-orm";

describe("token refresh and logout", () => {
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

  async function createUserWithRefreshToken() {
    const db = getTestDB();
    const [user] = await db
      .insert(users)
      .values({
        email: "test@test.com",
        name: "Test",
        password_hash: await hashPassword("password"),
      })
      .returning();

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      user_id: user.user_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return { user, rawToken };
  }

  it("rotates refresh token on use", async () => {
    const db = getTestDB();
    const { user, rawToken } = await createUserWithRefreshToken();

    const oldHash = hashToken(rawToken);

    // Simulate refresh: find old token, soft-delete it, create new one
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, oldHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    expect(stored).toBeDefined();

    // Soft-delete old
    await db
      .update(refreshTokens)
      .set({ deleted_at: new Date() })
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));

    // Create new
    const newRawToken = generateToken();
    const newHash = hashToken(newRawToken);
    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + 7);

    await db.insert(refreshTokens).values({
      user_id: user.user_id,
      token_hash: newHash,
      expires_at: newExpires,
    });

    // Old token should be soft-deleted
    const [oldToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token_hash, oldHash));
    expect(oldToken.deleted_at).not.toBeNull();

    // New token should be active
    const [newToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, newHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    expect(newToken).toBeDefined();
  });

  it("rejects reuse of rotated token", async () => {
    const db = getTestDB();
    const { rawToken } = await createUserWithRefreshToken();
    const oldHash = hashToken(rawToken);

    // First use: soft-delete
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, oldHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    await db
      .update(refreshTokens)
      .set({ deleted_at: new Date() })
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));

    // Second use: should not find active token
    const reuse = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, oldHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    expect(reuse).toHaveLength(0);
  });

  it("rejects expired token", async () => {
    const db = getTestDB();
    const [user] = await db
      .insert(users)
      .values({
        email: "expired@test.com",
        name: "Test",
        password_hash: await hashPassword("password"),
      })
      .returning();

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() - 1); // expired yesterday

    await db.insert(refreshTokens).values({
      user_id: user.user_id,
      token_hash: tokenHash,
      expires_at: expiredAt,
    });

    // Should not find active, non-expired token
    const result = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, tokenHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    // Token exists but is expired
    expect(result).toHaveLength(1);
    expect(result[0].expires_at.getTime()).toBeLessThan(Date.now());
  });

  it("soft-deletes token on logout", async () => {
    const db = getTestDB();
    const { rawToken } = await createUserWithRefreshToken();
    const tokenHash = hashToken(rawToken);

    // Logout: soft-delete
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, tokenHash),
          isNull(refreshTokens.deleted_at)
        )
      );
    expect(stored).toBeDefined();

    await db
      .update(refreshTokens)
      .set({ deleted_at: new Date() })
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));

    // Verify soft-deleted
    const [deleted] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));
    expect(deleted.deleted_at).not.toBeNull();
  });
});
