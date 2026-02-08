import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getOrgBySlug, changeRole, removeMember } from "@/lib/services/orgs";
import { changeRoleSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug, userId } = await params;
    const body = await request.json();
    const parsed = changeRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const org = await getOrgBySlug(slug);
    const updated = await changeRole(
      org.organization_id,
      userId,
      parsed.data.role,
      auth.userId
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug, userId } = await params;
    const org = await getOrgBySlug(slug);
    await removeMember(org.organization_id, userId, auth.userId);
    return NextResponse.json({ data: { message: "Member removed" } });
  } catch (error) {
    return errorResponse(error);
  }
}
