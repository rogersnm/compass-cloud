"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "./use-auth";

export function useOrg() {
  const params = useParams<{ orgSlug: string }>();
  const { memberships, isLoading } = useAuth();

  return useMemo(() => {
    const orgSlug = params?.orgSlug ?? null;
    if (!orgSlug) {
      return { orgSlug: null, orgId: null, role: null, isLoading, notMember: false };
    }
    const membership = memberships.find((m) => m.slug === orgSlug);
    return {
      orgSlug,
      orgId: membership?.organization_id ?? null,
      role: membership?.role ?? null,
      isLoading,
      notMember: !isLoading && !membership,
    };
  }, [params?.orgSlug, memberships, isLoading]);
}
