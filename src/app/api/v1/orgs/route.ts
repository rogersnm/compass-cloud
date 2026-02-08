import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/middleware";
import { createOrg, listUserOrgs } from "@/lib/services/orgs";
import { createOrgSchema } from "@/lib/validation";
import { errorResponse, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // Use authenticateUser (not authenticateRequest) because the caller
    // may not belong to any org yet.
    const auth = await authenticateUser(request);
    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const org = await createOrg({
      name: parsed.data.name,
      slug: parsed.data.slug,
      creatorUserId: auth.userId,
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    const orgs = await listUserOrgs(auth.userId);
    return NextResponse.json({ data: orgs });
  } catch (error) {
    return errorResponse(error);
  }
}
