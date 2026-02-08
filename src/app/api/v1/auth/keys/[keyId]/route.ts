import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { authenticateRequest } from "@/lib/auth/middleware";
import { errorResponse, NotFoundError } from "@/lib/errors";
import { eq, and, isNull } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { keyId } = await params;

    const [key] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.api_key_id, keyId),
          eq(apiKeys.user_id, auth.userId),
          isNull(apiKeys.deleted_at)
        )
      )
      .limit(1);

    if (!key) {
      throw new NotFoundError("API key not found");
    }

    await db
      .update(apiKeys)
      .set({ deleted_at: new Date() })
      .where(eq(apiKeys.api_key_id, keyId));

    return NextResponse.json({ data: { message: "API key deleted" } });
  } catch (error) {
    return errorResponse(error);
  }
}
