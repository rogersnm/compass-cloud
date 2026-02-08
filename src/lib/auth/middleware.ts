import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, apiKeys, orgMembers, organizations } from "@/lib/db/schema";
import { verifyToken } from "./jwt";
import { hashApiKey } from "./api-keys";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { eq, and, isNull } from "drizzle-orm";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: "admin" | "member";
}

export interface UserContext {
  userId: string;
}

/**
 * Authenticate a request and return user identity only (no org context).
 * Use for endpoints like org creation where no org exists yet.
 */
export async function authenticateUser(
  request: NextRequest
): Promise<UserContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing authorization header");
  }

  const token = authHeader.slice(7);

  if (token.startsWith("cpk_")) {
    const ctx = await authenticateApiKey(token);
    return { userId: ctx.userId };
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  return { userId: payload.userId };
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing authorization header");
  }

  const token = authHeader.slice(7);

  // API key auth: starts with "cpk_"
  if (token.startsWith("cpk_")) {
    return authenticateApiKey(token);
  }

  // JWT auth
  return authenticateJwt(token, request);
}

async function authenticateApiKey(key: string): Promise<AuthContext> {
  const keyHash = hashApiKey(key);

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.key_hash, keyHash), isNull(apiKeys.deleted_at)))
    .limit(1);

  if (!apiKey) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Update last_used
  await db
    .update(apiKeys)
    .set({ last_used: new Date() })
    .where(eq(apiKeys.api_key_id, apiKey.api_key_id));

  const [member] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, apiKey.organization_id),
        eq(orgMembers.user_id, apiKey.user_id),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (!member) {
    throw new ForbiddenError("No longer a member of this organization");
  }

  return {
    userId: apiKey.user_id,
    organizationId: apiKey.organization_id,
    role: member.role as "admin" | "member",
  };
}

async function authenticateJwt(
  token: string,
  request: NextRequest
): Promise<AuthContext> {
  const payload = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const orgSlug = request.headers.get("x-org-slug");
  if (!orgSlug) {
    throw new UnauthorizedError("X-Org-Slug header required for JWT auth");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, orgSlug), isNull(organizations.deleted_at)))
    .limit(1);

  if (!org) {
    throw new UnauthorizedError("Organization not found");
  }

  const [member] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, org.organization_id),
        eq(orgMembers.user_id, payload.userId),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (!member) {
    throw new ForbiddenError("Not a member of this organization");
  }

  return {
    userId: payload.userId,
    organizationId: org.organization_id,
    role: member.role as "admin" | "member",
  };
}
