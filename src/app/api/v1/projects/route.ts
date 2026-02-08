import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { createProject, listProjects } from "@/lib/services/projects";
import { createProjectSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const project = await createProject({
      name: parsed.data.name,
      key: parsed.data.key,
      body: parsed.data.body,
      orgId: auth.organizationId,
      userId: auth.userId,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );

    const result = await listProjects(auth.organizationId, cursor, limit);
    return NextResponse.json({
      data: result.data,
      next_cursor: result.nextCursor,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
