import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser } from "../helpers/fixtures";
import {
  createOrg,
  listUserOrgs,
  getOrgBySlug,
  updateOrg,
  deleteOrg,
  getAdminCount,
} from "@/lib/services/orgs";
import { organizations, orgMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

describe("organization CRUD", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("creates org with creator as admin", async () => {
    const db = getTestDB();
    const user = await createTestUser();

    const org = await createOrg({
      name: "Acme Corp",
      slug: "acme",
      creatorUserId: user.user_id,
    });

    expect(org.name).toBe("Acme Corp");
    expect(org.slug).toBe("acme");

    const [member] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organization_id, org.organization_id),
          eq(orgMembers.user_id, user.user_id)
        )
      );

    expect(member.role).toBe("admin");
  });

  it("auto-generates slug from name", async () => {
    const user = await createTestUser();
    const org = await createOrg({
      name: "My Cool Org",
      creatorUserId: user.user_id,
    });
    expect(org.slug).toBe("my-cool-org");
  });

  it("rejects duplicate slug", async () => {
    const user = await createTestUser();
    await createOrg({ name: "Org", slug: "dupe", creatorUserId: user.user_id });
    await expect(
      createOrg({ name: "Org 2", slug: "dupe", creatorUserId: user.user_id })
    ).rejects.toThrow("slug already taken");
  });

  it("lists user orgs", async () => {
    const user = await createTestUser();
    await createOrg({ name: "Org A", slug: "org-a", creatorUserId: user.user_id });
    await createOrg({ name: "Org B", slug: "org-b", creatorUserId: user.user_id });

    const orgs = await listUserOrgs(user.user_id);
    expect(orgs).toHaveLength(2);
  });

  it("gets org by slug", async () => {
    const user = await createTestUser();
    await createOrg({ name: "Find Me", slug: "find-me", creatorUserId: user.user_id });

    const org = await getOrgBySlug("find-me");
    expect(org.name).toBe("Find Me");
  });

  it("updates org (admin only)", async () => {
    const user = await createTestUser();
    await createOrg({
      name: "Old Name",
      slug: "old",
      creatorUserId: user.user_id,
    });

    const updated = await updateOrg("old", { name: "New Name" }, user.user_id);
    expect(updated.name).toBe("New Name");
  });

  it("rejects update from non-admin", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const member = await createTestUser({ email: "member@test.com" });
    const org = await createOrg({
      name: "Protected",
      slug: "protected",
      creatorUserId: admin.user_id,
    });

    const db = getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    await expect(
      updateOrg("protected", { name: "Hacked" }, member.user_id)
    ).rejects.toThrow("Admin access required");
  });

  it("soft-deletes org", async () => {
    const db = getTestDB();
    const user = await createTestUser();
    await createOrg({ name: "Delete Me", slug: "delete-me", creatorUserId: user.user_id });

    await deleteOrg("delete-me", user.user_id);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, "delete-me"));
    expect(org.deleted_at).not.toBeNull();
  });

  it("counts admins correctly", async () => {
    const user = await createTestUser();
    const org = await createOrg({
      name: "Admin Count",
      slug: "admin-count",
      creatorUserId: user.user_id,
    });

    const count = await getAdminCount(org.organization_id);
    expect(count).toBe(1);
  });

  it("rejects delete from non-admin", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const member = await createTestUser({ email: "member@test.com" });
    const org = await createOrg({
      name: "Protected",
      slug: "protected",
      creatorUserId: admin.user_id,
    });

    const db = getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    await expect(
      deleteOrg("protected", member.user_id)
    ).rejects.toThrow("Admin access required");
  });

  it("multi-tenant isolation: user cannot see other org", async () => {
    const userA = await createTestUser({ email: "a@test.com" });
    const userB = await createTestUser({ email: "b@test.com" });

    await createOrg({ name: "Org A", slug: "org-a", creatorUserId: userA.user_id });
    await createOrg({ name: "Org B", slug: "org-b", creatorUserId: userB.user_id });

    const orgsA = await listUserOrgs(userA.user_id);
    expect(orgsA).toHaveLength(1);
    expect(orgsA[0].slug).toBe("org-a");

    const orgsB = await listUserOrgs(userB.user_id);
    expect(orgsB).toHaveLength(1);
    expect(orgsB[0].slug).toBe("org-b");
  });
});
