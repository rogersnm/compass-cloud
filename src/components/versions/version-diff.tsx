"use client";

import { useState } from "react";
import { diffLines } from "diff";
import { Button } from "@/components/ui/button";

type EntityType = "task" | "document" | "project";

interface VersionDiffProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldVersion: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newVersion: Record<string, any>;
  entityType: EntityType;
}

const DIFF_FIELDS: Record<EntityType, string[]> = {
  task: ["title", "body", "status", "priority"],
  document: ["title", "body"],
  project: ["name", "body"],
};

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

interface DiffBlock {
  field: string;
  changes: ReturnType<typeof diffLines>;
  hasChanges: boolean;
}

function computeFieldDiffs(
  oldVersion: Record<string, unknown>,
  newVersion: Record<string, unknown>,
  entityType: EntityType
): DiffBlock[] {
  const fields = DIFF_FIELDS[entityType];
  return fields.map((field) => {
    const oldVal = stringify(oldVersion[field]);
    const newVal = stringify(newVersion[field]);
    const changes = diffLines(oldVal, newVal);
    const hasChanges = changes.some((c) => c.added || c.removed);
    return { field, changes, hasChanges };
  });
}

export function VersionDiff({
  oldVersion,
  newVersion,
  entityType,
}: VersionDiffProps) {
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">(
    "unified"
  );

  const diffs = computeFieldDiffs(oldVersion, newVersion, entityType);
  const changedDiffs = diffs.filter((d) => d.hasChanges);

  if (changedDiffs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No changes between these versions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">View:</span>
        <Button
          variant={viewMode === "unified" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("unified")}
        >
          Unified
        </Button>
        <Button
          variant={viewMode === "side-by-side" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("side-by-side")}
        >
          Side by Side
        </Button>
      </div>

      {changedDiffs.map((diff) => (
        <div key={diff.field} className="rounded-md border">
          <div className="border-b bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium capitalize">
              {diff.field}
            </span>
          </div>
          {viewMode === "unified" ? (
            <UnifiedView changes={diff.changes} />
          ) : (
            <SideBySideView changes={diff.changes} />
          )}
        </div>
      ))}
    </div>
  );
}

function UnifiedView({
  changes,
}: {
  changes: ReturnType<typeof diffLines>;
}) {
  let lineNum = 0;

  return (
    <pre className="overflow-x-auto p-0 text-sm">
      {changes.map((part, i) => {
        const lines = part.value.split("\n");
        // Remove trailing empty string from split
        if (lines[lines.length - 1] === "") lines.pop();

        return lines.map((line, j) => {
          if (!part.added && !part.removed) lineNum++;
          const bg = part.added
            ? "bg-green-500/15"
            : part.removed
              ? "bg-red-500/15"
              : "";
          const prefix = part.added ? "+" : part.removed ? "-" : " ";
          const textColor = part.added
            ? "text-green-700 dark:text-green-400"
            : part.removed
              ? "text-red-700 dark:text-red-400"
              : "";

          return (
            <div
              key={`${i}-${j}`}
              className={`flex ${bg} px-4 py-0.5 font-mono`}
            >
              <span className="w-8 shrink-0 select-none text-right text-muted-foreground">
                {!part.added && !part.removed ? lineNum : ""}
              </span>
              <span className="mx-2 w-4 shrink-0 select-none text-muted-foreground">
                {prefix}
              </span>
              <span className={textColor}>{line}</span>
            </div>
          );
        });
      })}
    </pre>
  );
}

function SideBySideView({
  changes,
}: {
  changes: ReturnType<typeof diffLines>;
}) {
  const leftLines: Array<{ text: string; type: "removed" | "context" }> = [];
  const rightLines: Array<{ text: string; type: "added" | "context" }> = [];

  for (const part of changes) {
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();

    if (part.added) {
      for (const line of lines) {
        rightLines.push({ text: line, type: "added" });
        leftLines.push({ text: "", type: "context" });
      }
    } else if (part.removed) {
      for (const line of lines) {
        leftLines.push({ text: line, type: "removed" });
        rightLines.push({ text: "", type: "context" });
      }
    } else {
      for (const line of lines) {
        leftLines.push({ text: line, type: "context" });
        rightLines.push({ text: line, type: "context" });
      }
    }
  }

  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="grid grid-cols-2 divide-x overflow-x-auto text-sm font-mono">
      <pre className="p-0">
        {Array.from({ length: maxLen }, (_, i) => {
          const l = leftLines[i] ?? { text: "", type: "context" as const };
          const bg = l.type === "removed" ? "bg-red-500/15" : "";
          const textColor =
            l.type === "removed"
              ? "text-red-700 dark:text-red-400"
              : "";
          return (
            <div key={i} className={`flex ${bg} px-4 py-0.5`}>
              <span className="w-8 shrink-0 select-none text-right text-muted-foreground">
                {l.type !== "context" || l.text ? i + 1 : ""}
              </span>
              <span className={`ml-2 ${textColor}`}>{l.text}</span>
            </div>
          );
        })}
      </pre>
      <pre className="p-0">
        {Array.from({ length: maxLen }, (_, i) => {
          const r = rightLines[i] ?? { text: "", type: "context" as const };
          const bg = r.type === "added" ? "bg-green-500/15" : "";
          const textColor =
            r.type === "added"
              ? "text-green-700 dark:text-green-400"
              : "";
          return (
            <div key={i} className={`flex ${bg} px-4 py-0.5`}>
              <span className="w-8 shrink-0 select-none text-right text-muted-foreground">
                {r.type !== "context" || r.text ? i + 1 : ""}
              </span>
              <span className={`ml-2 ${textColor}`}>{r.text}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
