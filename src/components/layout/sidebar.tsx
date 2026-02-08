"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "compass_sidebar_collapsed";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function navItems(orgSlug: string): NavItem[] {
  return [
    { label: "Dashboard", href: `/${orgSlug}`, icon: LayoutDashboard },
    { label: "Projects", href: `/${orgSlug}/projects`, icon: FolderKanban },
    { label: "Members", href: `/${orgSlug}/members`, icon: Users },
    { label: "Settings", href: `/${orgSlug}/settings`, icon: Settings },
  ];
}

export function Sidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  }

  const items = navItems(orgSlug);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Compass</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/${orgSlug}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const items = navItems(orgSlug);

  return (
    <nav className="space-y-1 p-4">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== `/${orgSlug}` && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
