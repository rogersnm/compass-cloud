import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser, createTestOrg, createTestMember } from "../helpers/fixtures";
import { deviceCodes, apiKeys } from "@/lib/db/schema";
import { generateDeviceCode, generateUserCode } from "@/lib/auth/device";
import { hashApiKey } from "@/lib/auth/api-keys";
import { eq, and, isNull, gt } from "drizzle-orm";

describe("device authorization flow", () => {
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

  it("generates valid device and user codes", () => {
    const dc = generateDeviceCode();
    expect(dc.length).toBe(64);

    const uc = generateUserCode();
    expect(uc.length).toBe(9); // 8 chars + 1 hyphen
    expect(uc[4]).toBe("-");
  });

  it("completes full device auth flow", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    const org = await createTestOrg();
    await createTestMember({
      organization_id: org.organization_id,
      user_id: user.user_id,
    });

    // Step 1: CLI starts device flow
    const device_code = generateDeviceCode();
    const user_code = generateUserCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await db.insert(deviceCodes).values({
      device_code,
      user_code,
      status: "pending",
      expires_at: expiresAt,
    });

    // Step 2: Poll (should be pending)
    const [pending] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.device_code, device_code),
          isNull(deviceCodes.deleted_at)
        )
      );
    expect(pending.status).toBe("pending");

    // Step 3: User authorizes
    await db
      .update(deviceCodes)
      .set({
        status: "authorized",
        user_id: user.user_id,
        organization_id: org.organization_id,
      })
      .where(eq(deviceCodes.device_code_id, pending.device_code_id));

    // Step 4: Poll again (should be authorized)
    const [authorized] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.device_code, device_code),
          isNull(deviceCodes.deleted_at)
        )
      );
    expect(authorized.status).toBe("authorized");
    expect(authorized.user_id).toBe(user.user_id);
    expect(authorized.organization_id).toBe(org.organization_id);
  });

  it("rejects expired device code", async () => {
    const db = getTestDB();
    const device_code = generateDeviceCode();
    const user_code = generateUserCode();
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() - 1); // already expired

    await db.insert(deviceCodes).values({
      device_code,
      user_code,
      status: "pending",
      expires_at: expiredAt,
    });

    const [code] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.device_code, device_code),
          isNull(deviceCodes.deleted_at),
          gt(deviceCodes.expires_at, new Date())
        )
      );

    expect(code).toBeUndefined();
  });

  it("rejects invalid user code during authorize", async () => {
    const db = getTestDB();
    const result = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.user_code, "XXXX-9999"),
          eq(deviceCodes.status, "pending"),
          isNull(deviceCodes.deleted_at)
        )
      );
    expect(result).toHaveLength(0);
  });
});
