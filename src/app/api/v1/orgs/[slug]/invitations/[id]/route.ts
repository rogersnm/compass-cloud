import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getOrgBySlug } from "@/lib/services/orgs";
import { cancelInvitation } from "@/lib/services/invitations";
import { errorResponse } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug, id } = await params;
    const org = await getOrgBySlug(slug);
    await cancelInvitation(id, org.organization_id, auth.userId);
    return NextResponse.json({ data: { message: "Invitation cancelled" } });
  } catch (error) {
    return errorResponse(error);
  }
}
