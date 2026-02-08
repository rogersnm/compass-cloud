import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, refreshTokens } from "@/lib/db/schema";
import { comparePassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { loginSchema } from "@/lib/validation";
import { errorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { eq, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || user.deleted_at) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const accessToken = signAccessToken({ userId: user.user_id });

    const rawRefreshToken = generateToken();
    const tokenHash = hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      user_id: user.user_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return NextResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: rawRefreshToken,
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
