"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Folder, CheckSquare, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { ApiResponse, SearchResult } from "@/lib/api/types";

interface SearchCommandProps {
  orgSlug: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  project: <Folder className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
};

export function SearchCommand({
  orgSlug,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SearchCommandProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get<ApiResponse<SearchResult[]>>(
          `/search?q=${encodeURIComponent(q)}&limit=20`
        );
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);

    switch (result.type) {
      case "project":
        router.push(`/${orgSlug}/projects/${result.project_key ?? result.id}`);
        break;
      case "task":
        router.push(`/${orgSlug}/projects/${result.project_key}/tasks/${result.key}`);
        break;
      case "document":
        router.push(`/${orgSlug}/projects/${result.project_key}/documents/${result.key}`);
        break;
    }
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }

  // Group results by type
  const projects = results.filter((r) => r.type === "project");
  const tasks = results.filter((r) => r.type === "task");
  const documents = results.filter((r) => r.type === "document");

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search across projects, tasks, and documents"
    >
      <CommandInput
        placeholder="Search projects, tasks, documents..."
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => handleSelect(r)}
                className="cursor-pointer"
              >
                {TYPE_ICONS.project}
                <span>{r.title}</span>
                {r.project_key && (
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {r.project_key}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => handleSelect(r)}
                className="cursor-pointer"
              >
                {TYPE_ICONS.task}
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {r.key}
                </span>
                <span className="truncate">{r.title}</span>
                {r.status && (
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {r.status}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {documents.length > 0 && (
          <CommandGroup heading="Documents">
            {documents.map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => handleSelect(r)}
                className="cursor-pointer"
              >
                {TYPE_ICONS.document}
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {r.key}
                </span>
                <span className="truncate">{r.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
