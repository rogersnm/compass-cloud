import { db } from "@/lib/db";
import { invitations, orgMembers } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { requireAdmin } from "./orgs";
import crypto from "crypto";

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createInvitation(params: {
  orgId: string;
  email: string;
  role: "admin" | "member";
  invitedByUserId: string;
}) {
  await requireAdmin(params.orgId, params.invitedByUserId);

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(invitations)
    .values({
      organization_id: params.orgId,
      email: params.email,
      role: params.role,
      invited_by_user_id: params.invitedByUserId,
      token,
      expires_at: expiresAt,
    })
    .returning();

  return { invitation, token };
}

export async function listInvitations(orgId: string) {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organization_id, orgId),
        isNull(invitations.accepted_at),
        isNull(invitations.deleted_at),
        gt(invitations.expires_at, new Date())
      )
    );
}

export async function acceptInvitation(token: string, userId: string) {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.token, token),
        isNull(invitations.deleted_at)
      )
    )
    .limit(1);

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (invitation.accepted_at) {
    throw new ValidationError("Invitation already accepted");
  }

  if (invitation.expires_at < new Date()) {
    throw new ValidationError("Invitation has expired");
  }

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, invitation.organization_id),
        eq(orgMembers.user_id, userId),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (existing) {
    throw new ConflictError("Already a member of this organization");
  }

  await db.insert(orgMembers).values({
    organization_id: invitation.organization_id,
    user_id: userId,
    role: invitation.role,
  });

  await db
    .update(invitations)
    .set({ accepted_at: new Date() })
    .where(eq(invitations.invitation_id, invitation.invitation_id));

  return invitation;
}

export async function cancelInvitation(
  invitationId: string,
  orgId: string,
  actorUserId: string
) {
  await requireAdmin(orgId, actorUserId);

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.invitation_id, invitationId),
        eq(invitations.organization_id, orgId),
        isNull(invitations.deleted_at)
      )
    )
    .limit(1);

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  await db
    .update(invitations)
    .set({ deleted_at: new Date() })
    .where(eq(invitations.invitation_id, invitationId));
}
