import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getProjectByKey, updateProject, deleteProject } from "@/lib/services/projects";
import { updateProjectSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const project = await getProjectByKey(key, auth.organizationId);
    return NextResponse.json({ data: project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const body = await request.json();
    const parsed = updateProjectSchema.parse(body);
    const project = await updateProject(key, parsed, auth.organizationId, auth.userId);
    return NextResponse.json({ data: project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    await deleteProject(key, auth.organizationId, auth.userId);
    return NextResponse.json({ data: { message: "Project deleted" } });
  } catch (error) {
    return errorResponse(error);
  }
}
