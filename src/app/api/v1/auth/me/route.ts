import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, orgMembers, organizations } from "@/lib/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import { errorResponse, UnauthorizedError } from "@/lib/errors";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7);

    // Support both JWT and API key for /me
    let userId: string;

    if (token.startsWith("cpk_")) {
      // API key: import and use hashApiKey
      const { hashApiKey } = await import("@/lib/auth/api-keys");
      const { apiKeys } = await import("@/lib/db/schema");
      const keyHash = hashApiKey(token);
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.key_hash, keyHash), isNull(apiKeys.deleted_at)))
        .limit(1);
      if (!apiKey) {
        throw new UnauthorizedError("Invalid API key");
      }
      userId = apiKey.user_id;
    } else {
      const payload = verifyToken(token);
      if (!payload) {
        throw new UnauthorizedError("Invalid or expired token");
      }
      userId = payload.userId;
    }

    const [user] = await db
      .select({
        user_id: users.user_id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(and(eq(users.user_id, userId), isNull(users.deleted_at)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Get org memberships
    const memberships = await db
      .select({
        organization_id: organizations.organization_id,
        slug: organizations.slug,
        name: organizations.name,
        role: orgMembers.role,
      })
      .from(orgMembers)
      .innerJoin(
        organizations,
        eq(orgMembers.organization_id, organizations.organization_id)
      )
      .where(
        and(
          eq(orgMembers.user_id, userId),
          isNull(orgMembers.deleted_at),
          isNull(organizations.deleted_at)
        )
      );

    return NextResponse.json({
      data: {
        ...user,
        memberships,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
