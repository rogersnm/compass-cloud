import { getTestDB } from "./db";
import * as schema from "@/lib/db/schema";

type UserInsert = typeof schema.users.$inferInsert;
type OrgInsert = typeof schema.organizations.$inferInsert;
type OrgMemberInsert = typeof schema.orgMembers.$inferInsert;
type ProjectInsert = typeof schema.projects.$inferInsert;
type TaskInsert = typeof schema.tasks.$inferInsert;
type DocumentInsert = typeof schema.documents.$inferInsert;

export async function createTestUser(overrides: Partial<UserInsert> = {}) {
  const db = getTestDB();
  const data: UserInsert = {
    email: `test-${crypto.randomUUID().slice(0, 8)}@example.com`,
    name: "Test User",
    password_hash: "$2b$10$placeholder",
    ...overrides,
  };
  const [user] = await db.insert(schema.users).values(data).returning();
  return user;
}

export async function createTestOrg(overrides: Partial<OrgInsert> = {}) {
  const db = getTestDB();
  const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
  const data: OrgInsert = {
    name: "Test Org",
    slug,
    ...overrides,
  };
  const [org] = await db
    .insert(schema.organizations)
    .values(data)
    .returning();
  return org;
}

export async function createTestMember(
  overrides: Partial<OrgMemberInsert> & {
    organization_id: string;
    user_id: string;
  }
) {
  const db = getTestDB();
  const data: OrgMemberInsert = {
    role: "admin",
    ...overrides,
  };
  const [member] = await db
    .insert(schema.orgMembers)
    .values(data)
    .returning();
  return member;
}

export async function createTestProject(
  overrides: Partial<ProjectInsert> & {
    organization_id: string;
    created_by_user_id: string;
  }
) {
  const db = getTestDB();
  const data: ProjectInsert = {
    key: `T${crypto.randomUUID().slice(0, 3).toUpperCase()}`,
    name: "Test Project",
    ...overrides,
  };
  const [project] = await db
    .insert(schema.projects)
    .values(data)
    .returning();
  return project;
}

export async function createTestTask(
  overrides: Partial<TaskInsert> & {
    organization_id: string;
    project_id: string;
    created_by_user_id: string;
  }
) {
  const db = getTestDB();
  const data: TaskInsert = {
    display_id: `TST-T${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
    title: "Test Task",
    ...overrides,
  };
  const [task] = await db.insert(schema.tasks).values(data).returning();
  return task;
}

export async function createTestDocument(
  overrides: Partial<DocumentInsert> & {
    organization_id: string;
    project_id: string;
    created_by_user_id: string;
  }
) {
  const db = getTestDB();
  const data: DocumentInsert = {
    display_id: `TST-D${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
    title: "Test Document",
    ...overrides,
  };
  const [doc] = await db
    .insert(schema.documents)
    .values(data)
    .returning();
  return doc;
}
