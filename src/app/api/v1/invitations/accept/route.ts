import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { acceptInvitation } from "@/lib/services/invitations";
import { acceptInvitationSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const invitation = await acceptInvitation(parsed.data.token, auth.userId);
    return NextResponse.json({
      data: {
        organization_id: invitation.organization_id,
        role: invitation.role,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
