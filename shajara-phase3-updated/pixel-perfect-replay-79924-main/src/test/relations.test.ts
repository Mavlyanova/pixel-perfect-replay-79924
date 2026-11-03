import { describe, it, expect } from "vitest";
import { relationEdges } from "@/lib/treeLayout";
import { seedState } from "@/lib/shajara";

const edges = () => seedState().trees[0]!.edges;

describe("drag-to-connect relations", () => {
  it("parent: target becomes parent of source", () => {
    expect(relationEdges(edges(), "n-cousin", "n-child", "parent")).toEqual([{ from: "n-child", to: "n-cousin", type: "parent" }]);
  });
  it("sibling shares the source's parents", () => {
    const out = relationEdges(edges(), "n-child", "n-cousin", "sibling");
    expect(out.map((e) => e.to)).toEqual(out.map(() => "n-cousin"));
    expect(out.length).toBeGreaterThan(0);
  });
  it("rejects a cycle (child as parent of its parent)", () => {
    const parent = edges().find((e) => e.type === "parent" && e.to === "n-child")!.from;
    expect(() => relationEdges(edges(), parent, "n-child", "parent")).toThrow();
  });
});
