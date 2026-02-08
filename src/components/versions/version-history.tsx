"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VersionDiff } from "./version-diff";

type EntityType = "task" | "document" | "project";

interface VersionHistoryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  versions: Record<string, any>[];
  entityType: EntityType;
}

export function VersionHistory({ versions, entityType }: VersionHistoryProps) {
  // Default: select latest (index 0) and previous (index 1) if they exist
  const [selectedLeft, setSelectedLeft] = useState<number>(
    versions.length > 1 ? 1 : 0
  );
  const [selectedRight, setSelectedRight] = useState<number>(0);
  const [showDiff, setShowDiff] = useState(false);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No version history available.
      </p>
    );
  }

  const canCompare = versions.length > 1 && selectedLeft !== selectedRight;

  function handleCompare() {
    setShowDiff(true);
  }

  // Ensure left is always the older version (higher index = lower version number)
  const oldIdx = Math.max(selectedLeft, selectedRight);
  const newIdx = Math.min(selectedLeft, selectedRight);

  return (
    <div className="space-y-6">
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </span>
          {canCompare && (
            <Button size="sm" onClick={handleCompare}>
              Compare
            </Button>
          )}
        </div>
        <div className="divide-y">
          {versions.map((v, idx) => {
            const isLeft = selectedLeft === idx;
            const isRight = selectedRight === idx;
            const isCurrent = v.is_current && !v.deleted_at;
            const isDeleted = !!v.deleted_at;

            return (
              <div
                key={`${v.version}`}
                className="flex items-center gap-4 px-4 py-3"
              >
                {versions.length > 1 && (
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="radio"
                        name="version-left"
                        checked={isLeft}
                        onChange={() => {
                          setSelectedLeft(idx);
                          setShowDiff(false);
                        }}
                        className="accent-red-500"
                      />
                      Old
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="radio"
                        name="version-right"
                        checked={isRight}
                        onChange={() => {
                          setSelectedRight(idx);
                          setShowDiff(false);
                        }}
                        className="accent-green-500"
                      />
                      New
                    </label>
                  </div>
                )}
                <div className="flex flex-1 items-center gap-3">
                  <span className="font-mono text-sm font-medium">
                    v{v.version}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                  {isDeleted && (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showDiff && canCompare && (
        <div>
          <h3 className="mb-3 text-sm font-medium">
            Comparing v{versions[oldIdx].version} → v{versions[newIdx].version}
          </h3>
          <VersionDiff
            oldVersion={versions[oldIdx]}
            newVersion={versions[newIdx]}
            entityType={entityType}
          />
        </div>
      )}
    </div>
  );
}
