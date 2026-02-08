import { describe, it, expect } from "vitest";
import { validateDAG } from "@/lib/dag/validate";
import { topologicalSort } from "@/lib/dag/topo-sort";

describe("DAG validation", () => {
  it("accepts empty graph", () => {
    const result = validateDAG([], []);
    expect(result.valid).toBe(true);
  });

  it("accepts single node", () => {
    const result = validateDAG(["A"], []);
    expect(result.valid).toBe(true);
  });

  it("accepts valid DAG (diamond)", () => {
    // D depends on B and C; B and C depend on A
    const result = validateDAG(
      ["A", "B", "C", "D"],
      [
        { from: "B", to: "A" },
        { from: "C", to: "A" },
        { from: "D", to: "B" },
        { from: "D", to: "C" },
      ]
    );
    expect(result.valid).toBe(true);
  });

  it("accepts linear chain", () => {
    const result = validateDAG(
      ["A", "B", "C"],
      [
        { from: "B", to: "A" },
        { from: "C", to: "B" },
      ]
    );
    expect(result.valid).toBe(true);
  });

  it("detects simple cycle (A->B->A)", () => {
    const result = validateDAG(
      ["A", "B"],
      [
        { from: "A", to: "B" },
        { from: "B", to: "A" },
      ]
    );
    expect(result.valid).toBe(false);
    expect(result.cycle).toBeDefined();
    expect(result.cycle!.length).toBeGreaterThan(2);
  });

  it("detects long cycle (A->D->C->B->A)", () => {
    const result = validateDAG(
      ["A", "B", "C", "D"],
      [
        { from: "A", to: "D" },
        { from: "B", to: "A" },
        { from: "C", to: "B" },
        { from: "D", to: "C" },
      ]
    );
    expect(result.valid).toBe(false);
    expect(result.cycle).toBeDefined();
  });

  it("detects self-loop", () => {
    const result = validateDAG(
      ["A"],
      [{ from: "A", to: "A" }]
    );
    expect(result.valid).toBe(false);
    expect(result.cycle).toBeDefined();
  });

  it("handles disconnected components", () => {
    const result = validateDAG(
      ["A", "B", "C"],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("ignores edges to unknown nodes", () => {
    const result = validateDAG(
      ["A", "B"],
      [
        { from: "A", to: "B" },
        { from: "A", to: "Z" }, // Z not in nodes
      ]
    );
    expect(result.valid).toBe(true);
  });
});

describe("topological sort", () => {
  it("sorts empty graph", () => {
    expect(topologicalSort([], [])).toEqual([]);
  });

  it("sorts linear chain", () => {
    const result = topologicalSort(
      ["A", "B", "C"],
      [
        { from: "B", to: "A" },
        { from: "C", to: "B" },
      ]
    );
    expect(result).toEqual(["A", "B", "C"]);
  });

  it("sorts diamond: A first, D last", () => {
    const result = topologicalSort(
      ["A", "B", "C", "D"],
      [
        { from: "B", to: "A" },
        { from: "C", to: "A" },
        { from: "D", to: "B" },
        { from: "D", to: "C" },
      ]
    );
    expect(result[0]).toBe("A");
    expect(result[3]).toBe("D");
  });

  it("sorts disconnected components", () => {
    const result = topologicalSort(["A", "B", "C"], []);
    expect(result).toHaveLength(3);
    // Alphabetical tie-breaking
    expect(result).toEqual(["A", "B", "C"]);
  });

  it("throws on cycle", () => {
    expect(() =>
      topologicalSort(
        ["A", "B"],
        [
          { from: "A", to: "B" },
          { from: "B", to: "A" },
        ]
      )
    ).toThrow("cycle detected");
  });

  it("produces valid ordering (deps before dependents)", () => {
    const result = topologicalSort(
      ["A", "B", "C", "D"],
      [
        { from: "B", to: "A" },
        { from: "C", to: "A" },
        { from: "D", to: "B" },
        { from: "D", to: "C" },
      ]
    );
    const indexOf = (n: string) => result.indexOf(n);
    expect(indexOf("A")).toBeLessThan(indexOf("B"));
    expect(indexOf("A")).toBeLessThan(indexOf("C"));
    expect(indexOf("B")).toBeLessThan(indexOf("D"));
    expect(indexOf("C")).toBeLessThan(indexOf("D"));
  });
});
