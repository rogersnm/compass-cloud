import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceCodes } from "@/lib/db/schema";
import { generateDeviceCode, generateUserCode } from "@/lib/auth/device";
import { errorResponse } from "@/lib/errors";

export async function POST() {
  try {
    const device_code = generateDeviceCode();
    const user_code = generateUserCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await db.insert(deviceCodes).values({
      device_code,
      user_code,
      status: "pending",
      expires_at: expiresAt,
    });

    return NextResponse.json({
      data: {
        device_code,
        user_code,
        verification_uri: "/auth/device/verify",
        expires_in: 600,
        interval: 5,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
