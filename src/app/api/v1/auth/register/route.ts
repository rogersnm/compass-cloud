import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/passwords";
import { registerSchema } from "@/lib/validation";
import { errorResponse, ConflictError, ValidationError } from "@/lib/errors";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, password, name } = parsed.data;

    const existing = await db
      .select({ user_id: users.user_id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("Email already registered");
    }

    const password_hash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        password_hash,
      })
      .returning({
        user_id: users.user_id,
        email: users.email,
        name: users.name,
      });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
