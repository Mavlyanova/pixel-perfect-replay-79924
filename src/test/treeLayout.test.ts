import { describe, it, expect } from "vitest";
import { seedState } from "@/lib/shajara";
import {
  ancestorsOf,
  computeBranches,
  computeHidden,
  descendantsOf,
  edgeBranch,
  layoutPositions,
  lifespan,
} from "@/lib/treeLayout";

const tree = seedState().trees[0]!;
const { nodes, edges } = tree;

describe("graph walks", () => {
  it("finds all four grandparents as ancestors of the child", () => {
    expect([...ancestorsOf(edges, "n-child")].sort()).toEqual(["n-father", "n-gf", "n-gm", "n-mgf", "n-mgm", "n-mother"]);
  });
  it("finds grandchildren as descendants", () => {
    expect([...descendantsOf(edges, "n-gf")].sort()).toEqual(["n-child", "n-father", "n-sister"]);
  });
});

describe("folding and isolation", () => {
  it("folding a node hides its descendants only", () => {
    const hidden = computeHidden(nodes, edges, new Set(["n-father"]), null);
    expect([...hidden].sort()).toEqual(["n-child", "n-sister"]);
  });
  it("isolating the father hides the maternal grandparents but keeps spouse", () => {
    const hidden = computeHidden(nodes, edges, new Set(), "n-father");
    expect(hidden.has("n-mgf")).toBe(true);
    expect(hidden.has("n-mgm")).toBe(true);
    expect(hidden.has("n-mother")).toBe(false);
    expect(hidden.has("n-child")).toBe(false);
    expect(hidden.size).toBe(3);
  });
  it("no filters hides nobody", () => {
    expect(computeHidden(nodes, edges, new Set(), null).size).toBe(0);
  });
});

describe("branch colouring", () => {
  const b = computeBranches(nodes, edges, "n-child");
  it("marks father's line paternal and mother's line maternal", () => {
    expect(b.get("n-father")).toBe("paternal");
    expect(b.get("n-gf")).toBe("paternal");
    expect(b.get("n-mother")).toBe("maternal");
    expect(b.get("n-mgm")).toBe("maternal");
    expect(b.get("n-child")).toBe("neutral");
  });
  it("colours edges from their parent side", () => {
    expect(edgeBranch(b, { id: "x", from: "n-gf", to: "n-father", type: "parent" })).toBe("paternal");
    expect(edgeBranch(b, { id: "y", from: "n-father", to: "n-mother", type: "spouse" })).toBe("neutral");
  });
});

describe("layout engine", () => {
  it("TB puts parents above children", () => {
    const p = layoutPositions(nodes, edges, "TB", false);
    expect(p["n-gf"]!.y).toBeLessThan(p["n-father"]!.y);
    expect(p["n-father"]!.y).toBeLessThan(p["n-child"]!.y);
  });
  it("BT puts parents below children", () => {
    const p = layoutPositions(nodes, edges, "BT", false);
    expect(p["n-father"]!.y).toBeGreaterThan(p["n-child"]!.y);
  });
  it("LR and RL mirror horizontally", () => {
    const lr = layoutPositions(nodes, edges, "LR", true);
    const rl = layoutPositions(nodes, edges, "RL", true);
    expect(lr["n-father"]!.x).toBeLessThan(lr["n-child"]!.x);
    expect(rl["n-father"]!.x).toBeGreaterThan(rl["n-child"]!.x);
  });
  it("formats lifespans", () => {
    expect(lifespan({ birthDate: "1938-01-15", deathDate: "2010-09-02" })).toBe("1938 – 2010");
    expect(lifespan({ birthDate: "1995-05-20" })).toBe("1995 –");
  });
});
