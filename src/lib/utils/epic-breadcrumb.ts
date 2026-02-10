import type { Task } from "@/lib/api/types";

/**
 * Build a breadcrumb string for a task's epic chain.
 * epicMap is keyed by each epic's `key` field.
 * Returns null if the task has no epic, or a string like "Grandparent > Parent > Epic".
 */
export function buildEpicBreadcrumb(
  epicKey: string | null,
  epicMap: Map<string, Task>
): string | null {
  if (!epicKey) return null;

  const titles: string[] = [];
  let currentKey: string | null = epicKey;
  let iterations = 0;

  while (currentKey && iterations < 10) {
    const epic = epicMap.get(currentKey);
    if (!epic) break;
    titles.push(epic.title);
    currentKey = epic.epic_key;
    iterations++;
  }

  if (titles.length === 0) return null;
  titles.reverse();
  return titles.join(" > ");
}
