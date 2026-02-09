import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import {
  getTaskByDisplayId,
  getDependencyKeysMap,
  getProjectKeyByTaskProjectId,
  updateTask,
  updateTaskDependencies,
  deleteTask,
} from "@/lib/services/tasks";
import { updateTaskSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const task = await getTaskByDisplayId(displayId, auth.organizationId);
    const [depsMap, project_key] = await Promise.all([
      getDependencyKeysMap([task.task_id]),
      getProjectKeyByTaskProjectId(task.project_id),
    ]);
    const depends_on = depsMap.get(task.task_id) ?? [];
    return NextResponse.json({
      data: { ...task, depends_on, project_key },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { depends_on, ...taskUpdates } = parsed.data;

    if (depends_on) {
      await updateTaskDependencies(
        displayId,
        depends_on,
        auth.organizationId,
      );
    }

    const hasTaskUpdates = Object.keys(taskUpdates).length > 0;
    if (hasTaskUpdates) {
      const updated = await updateTask(
        displayId,
        taskUpdates,
        auth.organizationId,
        auth.userId
      );
      return NextResponse.json({ data: updated });
    }

    const task = await getTaskByDisplayId(displayId, auth.organizationId);
    return NextResponse.json({ data: task });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    await deleteTask(displayId, auth.organizationId, auth.userId);
    return NextResponse.json({ data: { message: "Task deleted" } });
  } catch (error) {
    return errorResponse(error);
  }
}
