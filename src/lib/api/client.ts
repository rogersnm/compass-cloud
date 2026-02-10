import type { ApiError, ApiResponse, RefreshResponse } from "./types";

const TOKEN_KEY = "compass_access_token";
const REFRESH_KEY = "compass_refresh_token";
const ORG_SLUG_KEY = "compass_org_slug";

export function getAccessToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(TOKEN_KEY)
    : null;
}

export function getRefreshToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(REFRESH_KEY)
    : null;
}

export function getOrgSlug(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(ORG_SLUG_KEY)
    : null;
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function setOrgSlug(slug: string) {
  localStorage.setItem(ORG_SLUG_KEY, slug);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ORG_SLUG_KEY);
}

class ApiClient {
  private baseUrl: string;
  private refreshing: Promise<boolean> | null = null;

  constructor(baseUrl = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getAccessToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
    const slug = getOrgSlug();
    if (slug) h["X-Org-Slug"] = slug;
    return h;
  }

  private async refresh(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as ApiResponse<RefreshResponse>;
      setTokens(json.data.access_token, json.data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      if (!this.refreshing) {
        this.refreshing = this.refresh().finally(() => {
          this.refreshing = null;
        });
      }
      const ok = await this.refreshing;
      if (ok) {
        res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: this.headers(),
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      }

      if (!ok || res.status === 401) {
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Session expired");
      }
    }

    if (!res.ok) {
      const error = (await res.json().catch(() => ({
        error: { code: "UNKNOWN", message: res.statusText },
      }))) as ApiError;
      throw error;
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export const api = new ApiClient();
