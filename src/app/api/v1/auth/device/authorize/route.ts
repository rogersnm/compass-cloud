import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceCodes, orgMembers } from "@/lib/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import {
  errorResponse,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { eq, and, isNull, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // This endpoint requires JWT auth (user must be logged in via browser)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication required");
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    const body = await request.json();
    const { user_code, organization_id } = body;

    if (!user_code) {
      throw new ValidationError("user_code is required");
    }
    if (!organization_id) {
      throw new ValidationError("organization_id is required");
    }

    // Verify user is member of the organization
    const [member] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organization_id, organization_id),
          eq(orgMembers.user_id, payload.userId),
          isNull(orgMembers.deleted_at)
        )
      )
      .limit(1);

    if (!member) {
      throw new ForbiddenError("Not a member of this organization");
    }

    const [code] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.user_code, user_code),
          eq(deviceCodes.status, "pending"),
          isNull(deviceCodes.deleted_at),
          gt(deviceCodes.expires_at, new Date())
        )
      )
      .limit(1);

    if (!code) {
      throw new NotFoundError("Invalid or expired user code");
    }

    await db
      .update(deviceCodes)
      .set({
        status: "authorized",
        user_id: payload.userId,
        organization_id,
      })
      .where(eq(deviceCodes.device_code_id, code.device_code_id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
