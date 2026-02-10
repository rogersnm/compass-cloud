"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";

export function LandingNavButtons({
  size,
  signInVariant = "ghost",
}: {
  size?: "default" | "sm" | "lg" | "icon";
  signInVariant?: "ghost" | "outline";
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return (
      <Button size={size} asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    );
  }

  return (
    <>
      <Button size={size} variant={signInVariant} asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size={size} asChild>
        <Link href="/register">Get Started</Link>
      </Button>
    </>
  );
}
