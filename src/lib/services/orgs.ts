import { db } from "@/lib/db";
import {
  organizations,
  orgMembers,
  users,
  projects,
  tasks,
  documents,
  taskDependencies,
} from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export async function createOrg(params: {
  name: string;
  slug?: string;
  creatorUserId: string;
}) {
  const slug = params.slug || slugify(params.name);

  const existing = await db
    .select({ organization_id: organizations.organization_id })
    .from(organizations)
    .where(
      and(eq(organizations.slug, slug), isNull(organizations.deleted_at))
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError("Organization slug already taken");
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: params.name, slug })
    .returning();

  await db.insert(orgMembers).values({
    organization_id: org.organization_id,
    user_id: params.creatorUserId,
    role: "admin",
  });

  return org;
}

export async function listUserOrgs(userId: string) {
  return db
    .select({
      organization_id: organizations.organization_id,
      name: organizations.name,
      slug: organizations.slug,
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
}

export async function getOrgBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(
      and(eq(organizations.slug, slug), isNull(organizations.deleted_at))
    )
    .limit(1);

  if (!org) {
    throw new NotFoundError("Organization not found");
  }

  return org;
}

export async function updateOrg(
  slug: string,
  updates: { name?: string },
  userId: string
) {
  const org = await getOrgBySlug(slug);
  await requireAdmin(org.organization_id, userId);

  const [updated] = await db
    .update(organizations)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(organizations.organization_id, org.organization_id))
    .returning();

  return updated;
}

export async function deleteOrg(slug: string, userId: string) {
  const org = await getOrgBySlug(slug);
  await requireAdmin(org.organization_id, userId);

  const now = new Date();

  // Soft-delete cascade: tasks, documents, projects, members, org
  await db
    .update(tasks)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(tasks.organization_id, org.organization_id),
        isNull(tasks.deleted_at)
      )
    );

  await db
    .update(documents)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(documents.organization_id, org.organization_id),
        isNull(documents.deleted_at)
      )
    );

  await db
    .update(projects)
    .set({ deleted_at: now, is_current: false })
    .where(
      and(
        eq(projects.organization_id, org.organization_id),
        isNull(projects.deleted_at)
      )
    );

  await db
    .update(orgMembers)
    .set({ deleted_at: now })
    .where(
      and(
        eq(orgMembers.organization_id, org.organization_id),
        isNull(orgMembers.deleted_at)
      )
    );

  await db
    .update(organizations)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(organizations.organization_id, org.organization_id));
}

export async function requireAdmin(orgId: string, userId: string) {
  const [member] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.user_id, userId),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (!member || member.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }

  return member;
}

export async function getAdminCount(orgId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.role, "admin"),
        isNull(orgMembers.deleted_at)
      )
    );

  return Number(result.count);
}

export async function listMembers(orgId: string) {
  return db
    .select({
      user_id: users.user_id,
      email: users.email,
      name: users.name,
      role: orgMembers.role,
      joined_at: orgMembers.created_at,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.user_id, users.user_id))
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        isNull(orgMembers.deleted_at)
      )
    );
}

export async function changeRole(
  orgId: string,
  targetUserId: string,
  newRole: "admin" | "member",
  actorUserId: string
) {
  await requireAdmin(orgId, actorUserId);

  const [member] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.user_id, targetUserId),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  if (member.role === "admin" && newRole === "member") {
    const count = await getAdminCount(orgId);
    if (count <= 1) {
      throw new ValidationError(
        "Cannot demote the last admin"
      );
    }
  }

  await db
    .update(orgMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.user_id, targetUserId),
        isNull(orgMembers.deleted_at)
      )
    );

  return { ...member, role: newRole };
}

export async function removeMember(
  orgId: string,
  targetUserId: string,
  actorUserId: string
) {
  await requireAdmin(orgId, actorUserId);

  const [member] = await db
    .select()
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.user_id, targetUserId),
        isNull(orgMembers.deleted_at)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  if (member.role === "admin") {
    const count = await getAdminCount(orgId);
    if (count <= 1) {
      throw new ValidationError(
        "Cannot remove the last admin"
      );
    }
  }

  await db
    .update(orgMembers)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(orgMembers.organization_id, orgId),
        eq(orgMembers.user_id, targetUserId),
        isNull(orgMembers.deleted_at)
      )
    );
}
