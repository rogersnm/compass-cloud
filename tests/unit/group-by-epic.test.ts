import { describe, it, expect } from "vitest";
import { groupTasksByEpic } from "@/lib/utils/group-by-epic";
import type { Task } from "@/lib/api/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: crypto.randomUUID(),
    version: 1,
    organization_id: "org-1",
    project_id: "proj-1",
    key: overrides.key ?? `TEST-T${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`,
    title: "Test Task",
    type: "task",
    status: "open",
    priority: null,
    epic_key: null,
    body: "",
    is_current: true,
    created_by_user_id: "user-1",
    created_by: "Test User",
    created_at: new Date().toISOString(),
    deleted_at: null,
    position: 0,
    ...overrides,
  };
}

function makeEpic(overrides: Partial<Task> = {}): Task {
  return makeTask({ type: "epic", status: "open" as Task["status"], ...overrides });
}

describe("groupTasksByEpic", () => {
  it("returns empty sections with no epics", () => {
    const t1 = makeTask({ key: "T-1" });
    const t2 = makeTask({ key: "T-2" });

    const result = groupTasksByEpic([t1, t2], []);

    expect(result.sections).toHaveLength(0);
    expect(result.unassigned).toHaveLength(2);
  });

  it("groups tasks under flat epics", () => {
    const epic1 = makeEpic({ key: "E-1" });
    const epic2 = makeEpic({ key: "E-2" });
    const t1 = makeTask({ key: "T-1", epic_key: "E-1" });
    const t2 = makeTask({ key: "T-2", epic_key: "E-2" });
    const t3 = makeTask({ key: "T-3", epic_key: "E-1" });

    const result = groupTasksByEpic([t1, t2, t3], [epic1, epic2]);

    expect(result.sections).toHaveLength(2);
    expect(result.unassigned).toHaveLength(0);

    const s1 = result.sections.find((s) => s.epic.key === "E-1")!;
    expect(s1.tasks).toHaveLength(2);
    expect(s1.subEpics).toHaveLength(0);
    expect(s1.totalCount).toBe(2);

    const s2 = result.sections.find((s) => s.epic.key === "E-2")!;
    expect(s2.tasks).toHaveLength(1);
  });

  it("handles nested sub-epics", () => {
    const parent = makeEpic({ key: "E-PARENT" });
    const child = makeEpic({ key: "E-CHILD", epic_key: "E-PARENT" });
    const t1 = makeTask({ key: "T-1", epic_key: "E-PARENT" });
    const t2 = makeTask({ key: "T-2", epic_key: "E-CHILD" });
    const t3 = makeTask({ key: "T-3", epic_key: "E-CHILD", status: "closed" });

    const result = groupTasksByEpic([t1, t2, t3], [parent, child]);

    expect(result.sections).toHaveLength(1);
    const section = result.sections[0];
    expect(section.epic.key).toBe("E-PARENT");
    expect(section.tasks).toHaveLength(1); // only direct children
    expect(section.subEpics).toHaveLength(1);
    expect(section.subEpics[0].epic.key).toBe("E-CHILD");
    expect(section.subEpics[0].tasks).toHaveLength(2);
    expect(section.subEpics[0].closedCount).toBe(1);

    // Recursive counts
    expect(section.totalCount).toBe(3); // 1 direct + 2 under sub-epic
    expect(section.closedCount).toBe(1);
  });

  it("shows empty epics with zero counts", () => {
    const epic = makeEpic({ key: "E-EMPTY" });

    const result = groupTasksByEpic([], [epic]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].tasks).toHaveLength(0);
    expect(result.sections[0].totalCount).toBe(0);
    expect(result.sections[0].closedCount).toBe(0);
  });

  it("handles unassigned tasks alongside epics", () => {
    const epic = makeEpic({ key: "E-1" });
    const assigned = makeTask({ key: "T-1", epic_key: "E-1" });
    const unassigned = makeTask({ key: "T-2" });

    const result = groupTasksByEpic([assigned, unassigned], [epic]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].tasks).toHaveLength(1);
    expect(result.unassigned).toHaveLength(1);
    expect(result.unassigned[0].key).toBe("T-2");
  });

  it("computes progress counts correctly", () => {
    const epic = makeEpic({ key: "E-1" });
    const sub = makeEpic({ key: "E-SUB", epic_key: "E-1" });

    const tasks = [
      makeTask({ key: "T-1", epic_key: "E-1", status: "closed" }),
      makeTask({ key: "T-2", epic_key: "E-1", status: "open" }),
      makeTask({ key: "T-3", epic_key: "E-SUB", status: "closed" }),
      makeTask({ key: "T-4", epic_key: "E-SUB", status: "closed" }),
      makeTask({ key: "T-5", epic_key: "E-SUB", status: "in_progress" }),
    ];

    const result = groupTasksByEpic(tasks, [epic, sub]);

    const section = result.sections[0];
    expect(section.totalCount).toBe(5);
    expect(section.closedCount).toBe(3); // T-1 + T-3 + T-4
    expect(section.subEpics[0].totalCount).toBe(3);
    expect(section.subEpics[0].closedCount).toBe(2);
  });
});
