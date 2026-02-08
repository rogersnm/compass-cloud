import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceCodes, organizations } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/auth/api-keys";
import { apiKeys } from "@/lib/db/schema";
import { errorResponse, ValidationError } from "@/lib/errors";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code } = body;
    if (!device_code) {
      throw new ValidationError("device_code is required");
    }

    const [code] = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.device_code, device_code),
          isNull(deviceCodes.deleted_at)
        )
      )
      .limit(1);

    if (!code) {
      return NextResponse.json(
        { error: { code: "INVALID_CODE", message: "Invalid device code" } },
        { status: 400 }
      );
    }

    if (code.expires_at < new Date()) {
      await db
        .update(deviceCodes)
        .set({ status: "expired" })
        .where(eq(deviceCodes.device_code_id, code.device_code_id));
      return NextResponse.json(
        { error: { code: "EXPIRED_CODE", message: "Device code expired" } },
        { status: 400 }
      );
    }

    if (code.status === "pending") {
      return NextResponse.json({ data: { status: "pending" } });
    }

    if (code.status === "authorized" && code.user_id && code.organization_id) {
      // Generate API key for the authorized user
      const { key, hash, prefix } = generateApiKey();

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.organization_id, code.organization_id))
        .limit(1);

      await db.insert(apiKeys).values({
        user_id: code.user_id,
        organization_id: code.organization_id,
        key_hash: hash,
        key_prefix: prefix,
        name: "CLI (device auth)",
      });

      // Mark device code as used
      await db
        .update(deviceCodes)
        .set({ deleted_at: new Date() })
        .where(eq(deviceCodes.device_code_id, code.device_code_id));

      return NextResponse.json({
        data: {
          status: "authorized",
          api_key: key,
          org: org ? { slug: org.slug, name: org.name } : null,
        },
      });
    }

    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "Unexpected code state" } },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
