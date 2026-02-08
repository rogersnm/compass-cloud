import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getOrgBySlug, updateOrg, deleteOrg } from "@/lib/services/orgs";
import { updateOrgSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await authenticateRequest(request);
    const { slug } = await params;
    const org = await getOrgBySlug(slug);
    return NextResponse.json({ data: org });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug } = await params;
    const body = await request.json();
    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const updated = await updateOrg(slug, parsed.data, auth.userId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { slug } = await params;
    await deleteOrg(slug, auth.userId);
    return NextResponse.json({ data: { message: "Organization deleted" } });
  } catch (error) {
    return errorResponse(error);
  }
}
