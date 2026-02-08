"use client";

import { useEffect, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOrg } from "@/lib/hooks/use-org";
import { setOrgSlug } from "@/lib/api/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { isAuthenticated, isLoading } = useAuth();
  const { notMember, isLoading: orgLoading } = useOrg();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  useEffect(() => {
    if (orgSlug) {
      setOrgSlug(orgSlug);
    }
  }, [orgSlug]);

  if (isLoading || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (notMember) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You are not a member of this organization.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar orgSlug={orgSlug} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar orgSlug={orgSlug} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
