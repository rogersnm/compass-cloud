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
