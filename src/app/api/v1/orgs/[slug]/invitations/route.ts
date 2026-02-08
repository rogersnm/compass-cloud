import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getOrgBySlug } from "@/lib/services/orgs";
import {
  createInvitation,
  listInvitations,
} from "@/lib/services/invitations";
import { createInvitationSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug } = await params;
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const org = await getOrgBySlug(slug);
    const { invitation, token } = await createInvitation({
      orgId: org.organization_id,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: auth.userId,
    });

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const inviteLink = `${protocol}://${host}/invitations/accept?token=${token}`;

    return NextResponse.json(
      {
        data: {
          invitation_id: invitation.invitation_id,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
          invite_link: inviteLink,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await authenticateRequest(request);
    const { slug } = await params;
    const org = await getOrgBySlug(slug);
    const pending = await listInvitations(org.organization_id);
    return NextResponse.json({ data: pending });
  } catch (error) {
    return errorResponse(error);
  }
}
