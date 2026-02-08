"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiError } from "@/lib/api/types";

interface InviteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface InviteResponse {
  data: {
    invitation_id: string;
    email: string;
    role: string;
    expires_at: string;
    invite_link: string;
  };
}

export function InviteForm({ open, onOpenChange, orgSlug }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setInviteLink("");

    try {
      const res = await api.post<InviteResponse>(
        `/orgs/${orgSlug}/invitations`,
        { email, role }
      );
      setInviteLink(res.data.invite_link);
      await queryClient.invalidateQueries({
        queryKey: ["invitations", orgSlug],
      });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setEmail("");
      setRole("member");
      setError("");
      setInviteLink("");
      setCopied(false);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm">
              Invitation sent to <strong>{email}</strong>. Share this link:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="font-mono text-xs" />
              <Button size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
