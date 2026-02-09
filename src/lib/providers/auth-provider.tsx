"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setTokens, setOrgSlug, clearAuth } from "@/lib/api/client";
import type {
  ApiResponse,
  AuthMeResponse,
  LoginResponse,
  Membership,
  RegisterResponse,
  User,
} from "@/lib/api/types";

export interface AuthState {
  user: User | null;
  memberships: Membership[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Membership[]>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  setCurrentOrg: (slug: string) => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function hydrate() {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("compass_access_token")
          : null;
      if (!token) return;

      try {
        const res = await api.get<ApiResponse<AuthMeResponse>>("/auth/me");
        setUser({
          user_id: res.data.user_id,
          email: res.data.email,
          name: res.data.name,
        });
        setMemberships(res.data.memberships);
      } catch {
        clearAuth();
      }
    }
    hydrate().finally(() => setIsLoading(false));
  }, []);

  const refreshMemberships = useCallback(async () => {
    const res = await api.get<ApiResponse<AuthMeResponse>>("/auth/me");
    setMemberships(res.data.memberships);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
      email,
      password,
    });
    setTokens(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);

    const meRes = await api.get<ApiResponse<AuthMeResponse>>("/auth/me");
    setMemberships(meRes.data.memberships);

    if (meRes.data.memberships.length > 0) {
      setOrgSlug(meRes.data.memberships[0].slug);
    }

    return meRes.data.memberships;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.post<ApiResponse<RegisterResponse>>(
        "/auth/register",
        { name, email, password }
      );
      setTokens(res.data.access_token, "");
      setUser(res.data.user);
      setMemberships([]);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {
        refresh_token:
          typeof window !== "undefined"
            ? localStorage.getItem("compass_refresh_token")
            : null,
      });
    } catch {
      // fire-and-forget
    }
    clearAuth();
    setUser(null);
    setMemberships([]);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const handleSetCurrentOrg = useCallback((slug: string) => {
    setOrgSlug(slug);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshMemberships,
        setCurrentOrg: handleSetCurrentOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
