"use client";

import { Suspense } from "react";
import { AcceptInvitationContent } from "./content";

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <AcceptInvitationContent />
      </Suspense>
    </div>
  );
}
