import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { authenticateRequest } from "@/lib/auth/middleware";
import { generateApiKey } from "@/lib/auth/api-keys";
import { createApiKeySchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { key, hash, prefix } = generateApiKey();

    const [created] = await db
      .insert(apiKeys)
      .values({
        user_id: auth.userId,
        organization_id: auth.organizationId,
        key_hash: hash,
        key_prefix: prefix,
        name: parsed.data.name,
      })
      .returning({
        api_key_id: apiKeys.api_key_id,
        key_prefix: apiKeys.key_prefix,
        name: apiKeys.name,
        created_at: apiKeys.created_at,
      });

    return NextResponse.json(
      { data: { ...created, key } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    const keys = await db
      .select({
        api_key_id: apiKeys.api_key_id,
        key_prefix: apiKeys.key_prefix,
        name: apiKeys.name,
        last_used: apiKeys.last_used,
        created_at: apiKeys.created_at,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.user_id, auth.userId),
          eq(apiKeys.organization_id, auth.organizationId),
          isNull(apiKeys.deleted_at)
        )
      );

    return NextResponse.json({ data: keys });
  } catch (error) {
    return errorResponse(error);
  }
}
