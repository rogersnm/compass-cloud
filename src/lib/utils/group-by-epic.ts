import type { Task } from "@/lib/api/types";

export interface SubEpicSection {
  epic: Task;
  tasks: Task[];
  closedCount: number;
  totalCount: number;
}

export interface EpicSection {
  epic: Task;
  tasks: Task[];
  subEpics: SubEpicSection[];
  closedCount: number;
  totalCount: number;
}

export interface GroupByEpicResult {
  sections: EpicSection[];
  unassigned: Task[];
}

export function groupTasksByEpic(
  tasks: Task[],
  epics: Task[]
): GroupByEpicResult {
  const epicMap = new Map<string, Task>();
  for (const e of epics) epicMap.set(e.key, e);

  // Partition epics into top-level vs sub-epics
  const topEpics: Task[] = [];
  const subEpicsByParent = new Map<string, Task[]>();

  for (const e of epics) {
    if (e.epic_key && epicMap.has(e.epic_key)) {
      const list = subEpicsByParent.get(e.epic_key) ?? [];
      list.push(e);
      subEpicsByParent.set(e.epic_key, list);
    } else {
      topEpics.push(e);
    }
  }

  // Group non-epic tasks by epic_key
  const tasksByEpic = new Map<string, Task[]>();
  const unassigned: Task[] = [];

  for (const t of tasks) {
    if (!t.epic_key) {
      unassigned.push(t);
    } else {
      const list = tasksByEpic.get(t.epic_key) ?? [];
      list.push(t);
      tasksByEpic.set(t.epic_key, list);
    }
  }

  const sections: EpicSection[] = topEpics.map((epic) => {
    const directTasks = tasksByEpic.get(epic.key) ?? [];
    const childEpics = subEpicsByParent.get(epic.key) ?? [];

    const subEpics: SubEpicSection[] = childEpics.map((subEpic) => {
      const subTasks = tasksByEpic.get(subEpic.key) ?? [];
      const closedCount = subTasks.filter((t) => t.status === "closed").length;
      return {
        epic: subEpic,
        tasks: subTasks,
        closedCount,
        totalCount: subTasks.length,
      };
    });

    const directClosed = directTasks.filter((t) => t.status === "closed").length;
    const subClosed = subEpics.reduce((sum, s) => sum + s.closedCount, 0);
    const subTotal = subEpics.reduce((sum, s) => sum + s.totalCount, 0);

    return {
      epic,
      tasks: directTasks,
      subEpics,
      closedCount: directClosed + subClosed,
      totalCount: directTasks.length + subTotal,
    };
  });

  return { sections, unassigned };
}
