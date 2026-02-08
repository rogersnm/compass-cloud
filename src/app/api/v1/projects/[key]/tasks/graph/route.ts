import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getProjectByKey } from "@/lib/services/projects";
import { getTaskGraph } from "@/lib/services/tasks";
import { errorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const project = await getProjectByKey(key, auth.organizationId);
    const graph = await getTaskGraph(
      project.project_id,
      auth.organizationId
    );
    return NextResponse.json({ data: graph });
  } catch (error) {
    return errorResponse(error);
  }
}
