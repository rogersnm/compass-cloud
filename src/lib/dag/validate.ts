export interface Edge {
  from: string;
  to: string;
}

export interface ValidationResult {
  valid: boolean;
  cycle?: string[];
}

/**
 * Validate that a directed graph has no cycles using DFS with white/gray/black coloring.
 * Edges represent "from depends on to" (from -> to).
 */
export function validateDAG(
  nodes: string[],
  edges: Edge[]
): ValidationResult {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const nodeSet = new Set(nodes);
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node, []);
  }
  for (const { from, to } of edges) {
    if (nodeSet.has(from) && nodeSet.has(to)) {
      adj.get(from)!.push(to);
    }
  }

  const color = new Map<string, number>();
  const parent = new Map<string, string>();

  for (const node of nodes) {
    color.set(node, WHITE);
  }

  function dfs(node: string): string[] | null {
    color.set(node, GRAY);
    for (const dep of adj.get(node) || []) {
      if (!nodeSet.has(dep)) continue;
      if (color.get(dep) === GRAY) {
        return buildCyclePath(parent, node, dep);
      }
      if (color.get(dep) === WHITE) {
        parent.set(dep, node);
        const cycle = dfs(dep);
        if (cycle) return cycle;
      }
    }
    color.set(node, BLACK);
    return null;
  }

  for (const node of nodes) {
    if (color.get(node) === WHITE) {
      const cycle = dfs(node);
      if (cycle) {
        return { valid: false, cycle };
      }
    }
  }

  return { valid: true };
}

function buildCyclePath(
  parent: Map<string, string>,
  from: string,
  to: string
): string[] {
  const path = [to];
  let cur = from;
  while (cur !== to) {
    path.push(cur);
    cur = parent.get(cur)!;
  }
  path.push(to);
  path.reverse();
  return path;
}
