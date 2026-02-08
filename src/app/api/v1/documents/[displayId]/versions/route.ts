import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getDocumentVersions } from "@/lib/services/documents";
import { errorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const versions = await getDocumentVersions(displayId, auth.organizationId);
    return NextResponse.json({ data: versions });
  } catch (error) {
    return errorResponse(error);
  }
}
