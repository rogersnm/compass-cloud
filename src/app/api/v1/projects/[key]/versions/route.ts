import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getProjectVersions } from "@/lib/services/projects";
import { errorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const versions = await getProjectVersions(key, auth.organizationId);
    return NextResponse.json({ data: versions });
  } catch (error) {
    return errorResponse(error);
  }
}
