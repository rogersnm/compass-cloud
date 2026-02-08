import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { updateTask } from "@/lib/services/tasks";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const updated = await updateTask(
      displayId,
      { status: "closed" },
      auth.organizationId,
      auth.userId
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
