"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemberList } from "@/components/members/member-list";
import { InvitationList } from "@/components/members/invitation-list";
import { InviteForm } from "@/components/members/invite-form";
import { useOrg } from "@/lib/hooks/use-org";
import { useAuth } from "@/lib/hooks/use-auth";

export default function MembersPage() {
  const { orgSlug, role } = useOrg();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isAdmin = role === "admin";

  if (!orgSlug) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>Invite Member</Button>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Team Members</h2>
        <MemberList
          orgSlug={orgSlug}
          currentUserId={user?.user_id ?? ""}
          isAdmin={isAdmin}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Invitations</h2>
        <InvitationList orgSlug={orgSlug} isAdmin={isAdmin} />
      </section>

      {isAdmin && (
        <InviteForm
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}
