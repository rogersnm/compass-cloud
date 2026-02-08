"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";

/**
 * Wraps guest-only pages (login, register). Redirects authenticated
 * users to their first org's dashboard, or to /register if they have
 * no org yet.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, memberships } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const slug = memberships[0]?.slug;
    router.replace(slug ? `/${slug}` : "/");
    return null;
  }

  return <>{children}</>;
}
