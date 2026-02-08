import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getOrgBySlug, listMembers } from "@/lib/services/orgs";
import { errorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await authenticateRequest(request);
    const { slug } = await params;
    const org = await getOrgBySlug(slug);
    const members = await listMembers(org.organization_id);
    return NextResponse.json({ data: members });
  } catch (error) {
    return errorResponse(error);
  }
}
