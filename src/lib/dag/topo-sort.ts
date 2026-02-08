import { Edge } from "./validate";

/**
 * Topological sort using Kahn's algorithm.
 * Edges represent "from depends on to" (from -> to).
 * Returns nodes in dependency order: dependencies come first.
 */
export function topologicalSort(
  nodes: string[],
  edges: Edge[]
): string[] {
  const nodeSet = new Set(nodes);

  // Build adjacency: "from depends on to" means to -> from in reverse
  const forward = new Map<string, string[]>(); // node -> its dependencies
  const reverse = new Map<string, string[]>(); // node -> its dependents

  for (const node of nodes) {
    forward.set(node, []);
    reverse.set(node, []);
  }

  for (const { from, to } of edges) {
    if (nodeSet.has(from) && nodeSet.has(to)) {
      forward.get(from)!.push(to);
      reverse.get(to)!.push(from);
    }
  }

  // In-degree = number of dependencies each node has
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node, forward.get(node)!.length);
  }

  // Start with nodes that have no dependencies
  const queue = nodes
    .filter((n) => inDegree.get(n) === 0)
    .sort();

  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const dependent of reverse.get(node) || []) {
      if (!nodeSet.has(dependent)) continue;
      inDegree.set(dependent, inDegree.get(dependent)! - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }

  if (result.length !== nodes.length) {
    throw new Error("cycle detected: topological sort incomplete");
  }

  return result;
}
