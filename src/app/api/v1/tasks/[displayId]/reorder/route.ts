import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { reorderTask } from "@/lib/services/tasks";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const body = await request.json();

    if (typeof body.position !== "number" || !isFinite(body.position)) {
      throw new ValidationError("position must be a finite number");
    }

    await reorderTask(displayId, body.position, auth.organizationId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
