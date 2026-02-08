"use client";

import Link from "next/link";
import { GuestGuard } from "@/components/auth/guest-guard";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(37,99,235,0.12)_0%,_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(37,99,235,0.06)_0%,_transparent_50%)]" />
        <Link
          href="/"
          className="relative mb-8 text-2xl font-bold tracking-tight"
        >
          Compass
        </Link>
        <div className="relative w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </GuestGuard>
  );
}
