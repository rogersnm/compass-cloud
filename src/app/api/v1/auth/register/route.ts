import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/passwords";
import { signAccessToken } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/validation";
import { createOrg } from "@/lib/services/orgs";
import { errorResponse, ConflictError, ValidationError } from "@/lib/errors";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, password, name, org_name, org_slug } = parsed.data;

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

    const accessToken = signAccessToken({ userId: user.user_id });

    let org = null;
    if (org_name) {
      org = await createOrg({
        name: org_name,
        slug: org_slug,
        creatorUserId: user.user_id,
      });
    }

    return NextResponse.json(
      {
        data: {
          user,
          access_token: accessToken,
          org: org
            ? {
                organization_id: org.organization_id,
                name: org.name,
                slug: org.slug,
              }
            : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
