import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
} from "../helpers/db";
import { createTestUser } from "../helpers/fixtures";
import {
  createOrg,
  listMembers,
  changeRole,
  removeMember,
  getAdminCount,
} from "@/lib/services/orgs";
import { orgMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

describe("org member management", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("lists members with user info", async () => {
    const admin = await createTestUser({ email: "admin@test.com", name: "Admin" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const member = await createTestUser({ email: "member@test.com", name: "Member" });
    const db = (await import("../helpers/db")).getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    const members = await listMembers(org.organization_id);
    expect(members).toHaveLength(2);

    const adminEntry = members.find((m) => m.user_id === admin.user_id);
    expect(adminEntry).toBeDefined();
    expect(adminEntry!.role).toBe("admin");
    expect(adminEntry!.email).toBe("admin@test.com");

    const memberEntry = members.find((m) => m.user_id === member.user_id);
    expect(memberEntry).toBeDefined();
    expect(memberEntry!.role).toBe("member");
  });

  it("admin changes member role to admin", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const member = await createTestUser({ email: "member@test.com" });
    const db = (await import("../helpers/db")).getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    const updated = await changeRole(
      org.organization_id,
      member.user_id,
      "admin",
      admin.user_id
    );
    expect(updated.role).toBe("admin");
  });

  it("non-admin cannot change roles", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const member = await createTestUser({ email: "member@test.com" });
    const db = (await import("../helpers/db")).getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    const target = await createTestUser({ email: "target@test.com" });
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: target.user_id,
      role: "member",
    });

    await expect(
      changeRole(org.organization_id, target.user_id, "admin", member.user_id)
    ).rejects.toThrow("Admin access required");
  });

  it("rejects demoting last admin", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    await expect(
      changeRole(org.organization_id, admin.user_id, "member", admin.user_id)
    ).rejects.toThrow("Cannot demote the last admin");
  });

  it("allows demoting admin when multiple admins exist", async () => {
    const admin1 = await createTestUser({ email: "admin1@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin1.user_id });

    const admin2 = await createTestUser({ email: "admin2@test.com" });
    const db = (await import("../helpers/db")).getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: admin2.user_id,
      role: "admin",
    });

    const updated = await changeRole(
      org.organization_id,
      admin1.user_id,
      "member",
      admin2.user_id
    );
    expect(updated.role).toBe("member");
    expect(await getAdminCount(org.organization_id)).toBe(1);
  });

  it("removes non-admin member", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const member = await createTestUser({ email: "member@test.com" });
    const db = (await import("../helpers/db")).getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    await removeMember(org.organization_id, member.user_id, admin.user_id);

    const [row] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organization_id, org.organization_id),
          eq(orgMembers.user_id, member.user_id)
        )
      );
    expect(row.deleted_at).not.toBeNull();
  });

  it("rejects removing last admin", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    await expect(
      removeMember(org.organization_id, admin.user_id, admin.user_id)
    ).rejects.toThrow("Cannot remove the last admin");
  });
});
