import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema";
import { signAccessToken } from "@/lib/auth/jwt";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { refreshSchema } from "@/lib/validation";
import { errorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { eq, isNull, gt } from "drizzle-orm";
import { and } from "drizzle-orm";

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
          isNull(refreshTokens.deleted_at),
          gt(refreshTokens.expires_at, new Date())
        )
      )
      .limit(1);

    if (!stored) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Rotate: delete old token
    await db
      .update(refreshTokens)
      .set({ deleted_at: new Date() })
      .where(eq(refreshTokens.refresh_token_id, stored.refresh_token_id));

    // Issue new tokens
    const accessToken = signAccessToken({ userId: stored.user_id });
    const rawRefreshToken = generateToken();
    const newTokenHash = hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      user_id: stored.user_id,
      token_hash: newTokenHash,
      expires_at: expiresAt,
    });

    return NextResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: rawRefreshToken,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
