"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "./markdown-renderer";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

type Mode = "edit" | "split" | "preview";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  defaultMode?: Mode;
}

export function MarkdownEditor({
  value,
  onChange,
  defaultMode = "split",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const { resolvedTheme } = useTheme();

  const handleChange = useCallback(
    (v: string | undefined) => {
      onChange(v ?? "");
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(["edit", "split", "preview"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            variant={mode === m ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(m)}
          >
            {m === "edit" ? "Edit" : m === "split" ? "Split" : "Preview"}
          </Button>
        ))}
      </div>
      <div className="flex gap-4 rounded-md border">
        {(mode === "edit" || mode === "split") && (
          <div className={mode === "split" ? "w-1/2" : "w-full"}>
            <MonacoEditor
              height="300px"
              language="markdown"
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              value={value}
              onChange={handleChange}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                lineNumbers: "off",
                fontSize: 13,
                padding: { top: 12 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        )}
        {(mode === "preview" || mode === "split") && (
          <div
            className={`overflow-auto p-4 ${
              mode === "split" ? "w-1/2 border-l" : "w-full"
            }`}
            style={{ maxHeight: 300 }}
          >
            <MarkdownRenderer content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
