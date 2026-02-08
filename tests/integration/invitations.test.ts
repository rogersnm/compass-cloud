import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDB,
  teardownTestDB,
  truncateAllTables,
  getTestDB,
} from "../helpers/db";
import { createTestUser } from "../helpers/fixtures";
import { createOrg } from "@/lib/services/orgs";
import {
  createInvitation,
  listInvitations,
  acceptInvitation,
  cancelInvitation,
} from "@/lib/services/invitations";
import { invitations, orgMembers } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("invitation flow", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it("admin creates invitation with token", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const { invitation, token } = await createInvitation({
      orgId: org.organization_id,
      email: "invitee@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    expect(invitation.email).toBe("invitee@test.com");
    expect(invitation.role).toBe("member");
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
    expect(invitation.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it("non-admin cannot create invitation", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const member = await createTestUser({ email: "member@test.com" });
    const db = getTestDB();
    await db.insert(orgMembers).values({
      organization_id: org.organization_id,
      user_id: member.user_id,
      role: "member",
    });

    await expect(
      createInvitation({
        orgId: org.organization_id,
        email: "someone@test.com",
        role: "member",
        invitedByUserId: member.user_id,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("user accepts invitation and joins org", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const { token } = await createInvitation({
      orgId: org.organization_id,
      email: "invitee@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    const invitee = await createTestUser({ email: "invitee@test.com" });
    const result = await acceptInvitation(token, invitee.user_id);
    expect(result.organization_id).toBe(org.organization_id);

    const db = getTestDB();
    const [membership] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organization_id, org.organization_id),
          eq(orgMembers.user_id, invitee.user_id),
          isNull(orgMembers.deleted_at)
        )
      );

    expect(membership).toBeDefined();
    expect(membership.role).toBe("member");
  });

  it("rejects expired invitation", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const { invitation, token } = await createInvitation({
      orgId: org.organization_id,
      email: "late@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    // Manually expire the invitation
    const db = getTestDB();
    await db
      .update(invitations)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(invitations.invitation_id, invitation.invitation_id));

    const invitee = await createTestUser({ email: "late@test.com" });
    await expect(
      acceptInvitation(token, invitee.user_id)
    ).rejects.toThrow("Invitation has expired");
  });

  it("rejects already-accepted invitation", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const { token } = await createInvitation({
      orgId: org.organization_id,
      email: "first@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    const first = await createTestUser({ email: "first@test.com" });
    await acceptInvitation(token, first.user_id);

    const second = await createTestUser({ email: "second@test.com" });
    await expect(
      acceptInvitation(token, second.user_id)
    ).rejects.toThrow("Invitation already accepted");
  });

  it("lists only pending invitations", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    // Create 3 invitations
    await createInvitation({
      orgId: org.organization_id,
      email: "pending@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    const { token: acceptToken } = await createInvitation({
      orgId: org.organization_id,
      email: "accepted@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });
    const acceptUser = await createTestUser({ email: "accepted@test.com" });
    await acceptInvitation(acceptToken, acceptUser.user_id);

    const { invitation: expired } = await createInvitation({
      orgId: org.organization_id,
      email: "expired@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });
    const db = getTestDB();
    await db
      .update(invitations)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(invitations.invitation_id, expired.invitation_id));

    const pending = await listInvitations(org.organization_id);
    expect(pending).toHaveLength(1);
    expect(pending[0].email).toBe("pending@test.com");
  });

  it("admin cancels invitation", async () => {
    const admin = await createTestUser({ email: "admin@test.com" });
    const org = await createOrg({ name: "Test Org", slug: "test", creatorUserId: admin.user_id });

    const { invitation } = await createInvitation({
      orgId: org.organization_id,
      email: "cancel@test.com",
      role: "member",
      invitedByUserId: admin.user_id,
    });

    await cancelInvitation(invitation.invitation_id, org.organization_id, admin.user_id);

    const db = getTestDB();
    const [row] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.invitation_id, invitation.invitation_id));

    expect(row.deleted_at).not.toBeNull();

    // Should no longer appear in pending list
    const pending = await listInvitations(org.organization_id);
    expect(pending).toHaveLength(0);
  });
});
