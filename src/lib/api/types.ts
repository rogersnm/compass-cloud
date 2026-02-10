// ── Core entities ─────────────────────────────────────────────────────

export interface User {
  user_id: string;
  email: string;
  name: string;
}

export interface Membership {
  organization_id: string;
  slug: string;
  name: string;
  role: "admin" | "member";
}

export interface Organization {
  organization_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  project_id: string;
  version: number;
  organization_id: string;
  key: string;
  name: string;
  body: string;
  is_current: boolean;
  created_by_user_id: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Task {
  task_id: string;
  version: number;
  organization_id: string;
  project_id: string;
  key: string;
  title: string;
  type: "task" | "epic";
  status: "open" | "in_progress" | "closed";
  priority: number | null;
  epic_key: string | null;
  body: string;
  is_current: boolean;
  created_by_user_id: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  position: number;
}

export interface Document {
  document_id: string;
  version: number;
  organization_id: string;
  project_id: string;
  key: string;
  title: string;
  body: string;
  is_current: boolean;
  created_by_user_id: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Member {
  user_id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Invitation {
  invitation_id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by_user_id: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface ApiKey {
  api_key_id: string;
  key_prefix: string;
  name: string;
  last_used: string | null;
  created_at: string;
}

export interface SearchResult {
  type: "project" | "task" | "document";
  id: string;
  key: string;
  title: string;
  body: string;
  status?: string;
  project_key?: string;
  created_at: string;
}

// ── API response wrappers ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ── Auth-specific responses ───────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  access_token: string;
}

export interface AuthMeResponse {
  user_id: string;
  email: string;
  name: string;
  memberships: Membership[];
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}
