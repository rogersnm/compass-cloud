import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import {
  getTaskByDisplayId,
  updateTask,
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
    return NextResponse.json({ data: task });
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

    const updated = await updateTask(
      displayId,
      parsed.data,
      auth.organizationId,
      auth.userId
    );
    return NextResponse.json({ data: updated });
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
