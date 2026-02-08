import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { refreshSchema } from "@/lib/validation";
import { errorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { eq, isNull, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const tokenHash = hashToken(parsed.data.refresh_token);

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token_hash, tokenHash),
          isNull(refreshTokens.deleted_at)
        )
      )
      .limit(1);

    if (!stored) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    await db
      .update(refreshTokens)
      .set({ deleted_at: new Date() })
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));

    return NextResponse.json({ data: { message: "Logged out" } });
  } catch (error) {
    return errorResponse(error);
  }
}
