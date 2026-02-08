import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { getProjectByKey } from "@/lib/services/projects";
import { createTask, listTasks } from "@/lib/services/tasks";
import { createTaskSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const task = await createTask({
      projectKey: key,
      title: parsed.data.title,
      type: parsed.data.type,
      status: parsed.data.status,
      priority: parsed.data.priority,
      epicTaskId: parsed.data.epic_task_id,
      body: parsed.data.body,
      orgId: auth.organizationId,
      userId: auth.userId,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { key } = await params;
    const project = await getProjectByKey(key, auth.organizationId);

    const { searchParams } = new URL(request.url);
    const result = await listTasks(
      project.project_id,
      auth.organizationId,
      {
        status: searchParams.get("status") || undefined,
        type: searchParams.get("type") || undefined,
        epicId: searchParams.get("epic") || undefined,
        cursor: searchParams.get("cursor") || undefined,
        limit: Math.min(
          parseInt(searchParams.get("limit") || "50", 10),
          100
        ),
      }
    );

    return NextResponse.json({
      data: result.data,
      next_cursor: result.nextCursor,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
