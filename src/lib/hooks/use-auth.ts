"use client";

import { useContext } from "react";
import { AuthContext, type AuthState } from "@/lib/providers/auth-provider";

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
