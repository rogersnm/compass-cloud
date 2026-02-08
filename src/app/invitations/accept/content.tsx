"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiError, ApiResponse } from "@/lib/api/types";

interface AcceptResponse {
  organization_id: string;
  slug: string;
  name: string;
}

export function AcceptInvitationContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>No invitation token provided.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (authLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`/invitations/accept?token=${token}`);
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You need to sign in to accept this invitation.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href={`/login?redirect=${redirect}`}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/register?redirect=${redirect}`}>
              Create account
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function handleAccept() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<AcceptResponse>>(
        "/invitations/accept",
        { token }
      );
      router.push(`/${res.data.slug}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error?.message ?? "Failed to accept invitation");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Accept Invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join an organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAccept} className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Join Organization"}
        </Button>
      </CardFooter>
    </Card>
  );
}
