import { describe, it, expect, vi } from "vitest";
import { assertCanMutate, claimNode, createOwnTree, findUnlinkedMatch, PermissionError, seedState } from "@/lib/shajara";

const user = { id: "u1", fullName: "Aziz Yusupov", birthDate: "1995-05-20", nodeId: null };

describe("permissions", () => {
  it("blocks Viewer mutations with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertCanMutate("Viewer")).toThrow(PermissionError);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it("allows Owner and Editor", () => {
    expect(() => assertCanMutate("Owner")).not.toThrow();
    expect(() => assertCanMutate("Editor")).not.toThrow();
  });
});

describe("matching", () => {
  it("finds exact name + birthdate on unlinked node with parents", () => {
    const m = findUnlinkedMatch(seedState().trees, "  aziz   yusupov ", "1995-05-20");
    expect(m?.node.id).toBe("n-child");
    expect(m?.father?.fullName).toBe("Karim Yusupov");
    expect(m?.mother?.fullName).toBe("Dilnoza Yusupova");
  });
  it("returns null when birthdate differs", () => {
    expect(findUnlinkedMatch(seedState().trees, "Aziz Yusupov", "1995-05-21")).toBeNull();
  });
  it("ignores already-claimed nodes", () => {
    const s = claimNode(seedState(), "t-yusupov", "n-child", user);
    expect(findUnlinkedMatch(s.trees, "Aziz Yusupov", "1995-05-20")).toBeNull();
  });
});

describe("tree binding", () => {
  it("claiming binds user as Viewer", () => {
    const s = claimNode(seedState(), "t-yusupov", "n-child", user);
    expect(s.trees[0]?.members["u1"]).toBe("Viewer");
    expect(s.user?.nodeId).toBe("n-child");
    expect(s.activeTreeId).toBe("t-yusupov");
  });
  it("creating own tree makes user Owner", () => {
    const s = createOwnTree(seedState(), { ...user, fullName: "Ali Valiyev" });
    const tree = s.trees.find((t) => t.id === s.activeTreeId)!;
    expect(tree.members["u1"]).toBe("Owner");
    expect(tree.nodes).toHaveLength(1);
  });
});

import { isInTree, LastOwnerError, setMemberRole } from "@/lib/shajara";

describe("role management", () => {
  const tree = () => seedState().trees[0]!;
  it("Owner can change an Editor to Viewer", () => {
    expect(setMemberRole(tree(), "Owner", "u-dilnoza", "Viewer").members["u-dilnoza"]).toBe("Viewer");
  });
  it("Editor cannot change roles", () => {
    expect(() => setMemberRole(tree(), "Editor", "u-dilnoza", "Owner")).toThrow(PermissionError);
  });
  it("cannot demote the last Owner", () => {
    expect(() => setMemberRole(tree(), "Owner", "u-karim", "Editor")).toThrow(LastOwnerError);
  });
});

describe("in-tree status", () => {
  it("linked person is in tree, unlinked is not", () => {
    expect(isInTree(seedState().trees[0]!, "n-child")).toBe(true);
    expect(isInTree(seedState().trees[0]!, "n-cousin")).toBe(false);
  });
});
