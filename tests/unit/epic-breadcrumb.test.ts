import { describe, it, expect } from "vitest";
import { buildEpicBreadcrumb } from "@/lib/utils/epic-breadcrumb";
import type { Task } from "@/lib/api/types";

function makeEpic(key: string, title: string, epicKey: string | null = null): Task {
  return {
    task_id: key,
    version: 1,
    organization_id: "org",
    project_id: "proj",
    key,
    title,
    type: "epic",
    status: "open",
    priority: null,
    epic_key: epicKey,
    body: "",
    is_current: true,
    created_by_user_id: "u",
    created_by: "user",
    created_at: "",
    deleted_at: null,
    position: 0,
  };
}

describe("buildEpicBreadcrumb", () => {
  it("returns null when no epic key", () => {
    expect(buildEpicBreadcrumb(null, new Map())).toBeNull();
  });

  it("returns single epic title", () => {
    const epicMap = new Map([["E1", makeEpic("E1", "Epic One")]]);
    expect(buildEpicBreadcrumb("E1", epicMap)).toBe("Epic One");
  });

  it("returns 3-level chain root-first", () => {
    const epicMap = new Map([
      ["E1", makeEpic("E1", "Root")],
      ["E2", makeEpic("E2", "Middle", "E1")],
      ["E3", makeEpic("E3", "Leaf", "E2")],
    ]);
    expect(buildEpicBreadcrumb("E3", epicMap)).toBe("Root > Middle > Leaf");
  });

  it("guards against circular references", () => {
    const epicMap = new Map([
      ["E1", makeEpic("E1", "A", "E2")],
      ["E2", makeEpic("E2", "B", "E1")],
    ]);
    // Should not infinite loop; returns at most 10 items
    const result = buildEpicBreadcrumb("E1", epicMap);
    expect(result).toBeTruthy();
    expect(result!.split(" > ").length).toBeLessThanOrEqual(10);
  });

  it("returns null when key not in map", () => {
    expect(buildEpicBreadcrumb("MISSING", new Map())).toBeNull();
  });
});
