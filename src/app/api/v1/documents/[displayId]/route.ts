import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import {
  getDocumentByDisplayId,
  updateDocument,
  deleteDocument,
} from "@/lib/services/documents";
import { updateDocumentSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { displayId } = await params;
    const doc = await getDocumentByDisplayId(displayId, auth.organizationId);
    return NextResponse.json({ data: doc });
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
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const updated = await updateDocument(
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
    await deleteDocument(displayId, auth.organizationId, auth.userId);
    return NextResponse.json({ data: { message: "Document deleted" } });
  } catch (error) {
    return errorResponse(error);
  }
}
