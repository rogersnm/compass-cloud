"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FolderKanban,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Eye,
  ListTodo,
  Columns3,
  FileText,
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
    { label: "Projects", href: `/${orgSlug}/projects`, icon: FolderKanban },
    { label: "Members", href: `/${orgSlug}/members`, icon: Users },
    { label: "Settings", href: `/${orgSlug}/settings`, icon: Settings },
  ];
}

function projectSubItems(orgSlug: string, projectKey: string): NavItem[] {
  const base = `/${orgSlug}/projects/${projectKey}`;
  return [
    { label: "Overview", href: base, icon: Eye },
    { label: "Tasks", href: `${base}/tasks`, icon: ListTodo },
    { label: "Board", href: `${base}/board`, icon: Columns3 },
    { label: "Documents", href: `${base}/documents`, icon: FileText },
  ];
}

function getProjectKey(pathname: string): string | null {
  const match = pathname.match(/\/projects\/([^/]+)/);
  if (!match) return null;
  const key = match[1];
  // The projects list page itself is not "inside" a project
  if (pathname.endsWith("/projects")) return null;
  return key;
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
  const projectKey = getProjectKey(pathname);
  const subItems = projectKey ? projectSubItems(orgSlug, projectKey) : [];

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full flex-col border-r bg-sidebar text-sidebar-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
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
            pathname === item.href || pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              <Link
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
              {item.label === "Projects" && !collapsed && subItems.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  <span className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50">
                    {projectKey}
                  </span>
                  {subItems.map((sub) => {
                    const subActive = sub.label === "Overview"
                      ? pathname === sub.href
                      : pathname.startsWith(sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                          subActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const items = navItems(orgSlug);
  const projectKey = getProjectKey(pathname);
  const subItems = projectKey ? projectSubItems(orgSlug, projectKey) : [];

  return (
    <nav className="space-y-1 p-4">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href);
        return (
          <div key={item.href}>
            <Link
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
            {item.label === "Projects" && subItems.length > 0 && (
              <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                <span className="px-2 py-1 text-xs font-semibold text-muted-foreground/50">
                  {projectKey}
                </span>
                {subItems.map((sub) => {
                  const subActive = sub.label === "Overview"
                    ? pathname === sub.href
                    : pathname.startsWith(sub.href);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                        subActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground/60 hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
