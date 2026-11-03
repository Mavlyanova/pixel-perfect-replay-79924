import { describe, it, expect } from "vitest";
import { createNamedTree, deleteTree, inviteMember, listCollaborators, renameTree, seedState, switchTree, userTrees, LastOwnerError, PermissionError, type ShajaraState } from "@/lib/shajara";

const signedIn = (): ShajaraState => {
  const s = seedState();
  return { ...s, user: { id: "u-karim", fullName: "Karim Yusupov", birthDate: "1965-03-12", nodeId: "n-father" }, activeTreeId: "t-yusupov" };
};

describe("tree workspaces", () => {
  it("creates a new tree owned by the user with their own card and switches to it", () => {
    const s = createNamedTree(signedIn(), "Qodirovlar");
    const tree = s.trees.find((t) => t.id === s.activeTreeId)!;
    expect(tree.name).toBe("Qodirovlar");
    expect(tree.members["u-karim"]).toBe("Owner");
    expect(tree.nodes[0].claimedBy).toBe("u-karim");
    expect(s.user!.nodeId).toBe(tree.nodes[0].id);
  });
  it("switching back restores the user's card in that tree", () => {
    const s = switchTree(createNamedTree(signedIn(), "B"), "t-yusupov");
    expect(s.user!.nodeId).toBe("n-father");
    expect(userTrees(s)).toHaveLength(2);
  });
  it("only owners rename; editors are blocked", () => {
    const tree = signedIn().trees[0];
    expect(renameTree(tree, "Owner", "  New  ").name).toBe("New");
    expect(() => renameTree(tree, "Editor", "X")).toThrow(PermissionError);
  });
  it("cannot delete the user's last tree", () => {
    expect(() => deleteTree(signedIn(), "t-yusupov")).toThrow(LastOwnerError);
    const s = createNamedTree(signedIn(), "B");
    expect(userTrees(deleteTree(s, "t-yusupov"))).toHaveLength(1);
  });
  it("owners invite collaborators with a role; viewers cannot", () => {
    const tree = signedIn().trees[0];
    const next = inviteMember(tree, "Owner", "Lola Karimova", "Editor");
    const c = listCollaborators(next, null).find((x) => x.name === "Lola Karimova")!;
    expect(c.role).toBe("Editor");
    expect(() => inviteMember(tree, "Viewer", "X", "Viewer")).toThrow(PermissionError);
  });
});
