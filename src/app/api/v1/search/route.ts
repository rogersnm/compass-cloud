import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { search } from "@/lib/services/search";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      throw new ValidationError("Query parameter 'q' is required");
    }

    const results = await search({
      query,
      projectId: searchParams.get("project") || undefined,
      orgId: auth.organizationId,
      limit: Math.min(
        parseInt(searchParams.get("limit") || "50", 10),
        100
      ),
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    return errorResponse(error);
  }
}
