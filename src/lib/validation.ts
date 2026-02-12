import { z } from "zod/v4";

export const registerSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(255),
});

export const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
});

export const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const createInvitationSchema = z.object({
  email: z.email("Invalid email format"),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  type: z.enum(["task", "epic"]).optional().default("task"),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  priority: z.number().int().min(0).max(3).nullable().optional(),
  epic_key: z.string().nullable().optional(),
  body: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  priority: z.number().int().min(0).max(3).nullable().optional(),
  epic_key: z.string().nullable().optional(),
  body: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  body: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  key: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z0-9]+$/, "Key must be uppercase alphanumeric")
    .optional(),
  body: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  body: z.string().optional(),
});
