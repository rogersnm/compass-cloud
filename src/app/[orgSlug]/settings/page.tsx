"use client";

import { Separator } from "@/components/ui/separator";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { ApiKeyList } from "@/components/settings/api-key-list";
import { useOrg } from "@/lib/hooks/use-org";

export default function SettingsPage() {
  const { orgSlug, role } = useOrg();

  const isAdmin = role === "admin";

  if (!orgSlug) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Organization</h2>
        <OrgSettingsForm orgSlug={orgSlug} isAdmin={isAdmin} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <ApiKeyList />
      </section>
    </div>
  );
}
