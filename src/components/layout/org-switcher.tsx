"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { setOrgSlug } from "@/lib/api/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";

export function OrgSwitcher({ currentSlug }: { currentSlug: string }) {
  const { memberships } = useAuth();
  const router = useRouter();

  if (memberships.length <= 1) return null;

  const current = memberships.find((m) => m.slug === currentSlug);

  function switchOrg(slug: string) {
    setOrgSlug(slug);
    router.push(`/${slug}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <span className="max-w-[120px] truncate text-xs">
            {current?.name ?? currentSlug}
          </span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {memberships.map((m) => (
          <DropdownMenuItem key={m.slug} onClick={() => switchOrg(m.slug)}>
            <span className="flex-1">{m.name}</span>
            {m.slug === currentSlug && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
