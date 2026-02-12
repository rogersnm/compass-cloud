import { api } from "./client";
import type { PaginatedResponse, Task } from "./types";

export async function fetchAllPages(
  projectKey: string,
  type: string
): Promise<Task[]> {
  const all: Task[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ type, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const res = await api.get<PaginatedResponse<Task>>(
      `/projects/${projectKey}/tasks?${params.toString()}`
    );
    all.push(...res.data);
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return all;
}
