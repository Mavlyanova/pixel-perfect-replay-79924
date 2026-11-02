export type Role = "Owner" | "Editor" | "Viewer";
export type Gender = "male" | "female";

export interface PersonNode {
  id: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  claimedBy: string | null;
  deathDate?: string;
  avatarUrl?: string;
  notes?: string;
  documents?: { label: string; url: string }[];
  metadata?: Record<string, string>;
}

export type EdgeType = "parent" | "spouse";
export interface Edge {
  id: string;
  from: string; // parent (for "parent")
  to: string; // child (for "parent")
  type: EdgeType;
}

export interface User {
  id: string;
  fullName: string;
  birthDate: string;
  nodeId: string | null;
}

export interface Tree {
  id: string;
  name: string;
  ownerId: string | null;
  nodes: PersonNode[];
  edges: Edge[];
  members: Record<string, Role>;
}

export interface ShajaraState {
  trees: Tree[];
  activeTreeId: string | null;
  user: User | null;
}

export const STORAGE_KEY = "shajara:state:v1";

export class PermissionError extends Error {
  constructor(message = "VIEWER_MUTATION_BLOCKED") {
    super(message);
    this.name = "PermissionError";
  }
}

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function canMutate(role: Role | null): boolean {
  return role === "Owner" || role === "Editor";
}

export function assertCanMutate(role: Role | null): void {
  if (!canMutate(role)) {
    console.warn("[Shajara] ⚠ Viewer attempted a data mutation — blocked.");
    throw new PermissionError();
  }
}

export interface Match {
  tree: Tree;
  node: PersonNode;
  father: PersonNode | null;
  mother: PersonNode | null;
}

export function getParents(tree: Tree, nodeId: string) {
  const parentIds = tree.edges
    .filter((e) => e.type === "parent" && e.to === nodeId)
    .map((e) => e.from);
  const parents = tree.nodes.filter((n) => parentIds.includes(n.id));
  return {
    father: parents.find((p) => p.gender === "male") ?? null,
    mother: parents.find((p) => p.gender === "female") ?? null,
  };
}

export function findUnlinkedMatch(
  trees: Tree[],
  fullName: string,
  birthDate: string,
): Match | null {
  const target = normalizeName(fullName);
  for (const tree of trees) {
    const node = tree.nodes.find(
      (n) => !n.claimedBy && normalizeName(n.fullName) === target && n.birthDate === birthDate,
    );
    if (node) return { tree, node, ...getParents(tree, node.id) };
  }
  return null;
}

export function claimNode(state: ShajaraState, treeId: string, nodeId: string, user: User): ShajaraState {
  return {
    ...state,
    activeTreeId: treeId,
    user: { ...user, nodeId },
    trees: state.trees.map((t) =>
      t.id !== treeId
        ? t
        : {
            ...t,
            nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, claimedBy: user.id } : n)),
            members: { ...t.members, [user.id]: "Viewer" },
          },
    ),
  };
}

export function createOwnTree(state: ShajaraState, user: User): ShajaraState {
  const node: PersonNode = {
    id: uid(),
    fullName: user.fullName,
    birthDate: user.birthDate,
    gender: "male",
    claimedBy: user.id,
  };
  const tree: Tree = {
    id: uid(),
    name: `${user.fullName.split(" ")[0]} shajarasi`,
    ownerId: user.id,
    nodes: [node],
    edges: [],
    members: { [user.id]: "Owner" },
  };
  return { trees: [...state.trees, tree], activeTreeId: tree.id, user: { ...user, nodeId: node.id } };
}

export function seedState(): ShajaraState {
  const gf: PersonNode = { id: "n-gf", fullName: "Rustam Yusupov", birthDate: "1938-01-15", deathDate: "2010-09-02", gender: "male", claimedBy: null, notes: "Samarqandda bog'bon bo'lib ishlagan." };
  const gm: PersonNode = { id: "n-gm", fullName: "Saodat Yusupova", birthDate: "1942-04-10", deathDate: "2015-12-20", gender: "female", claimedBy: null };
  const mgf: PersonNode = { id: "n-mgf", fullName: "Anvar Qodirov", birthDate: "1940-06-01", deathDate: "2005-03-11", gender: "male", claimedBy: null };
  const mgm: PersonNode = { id: "n-mgm", fullName: "Gulnora Qodirova", birthDate: "1944-02-22", gender: "female", claimedBy: null };
  const f: PersonNode = { id: "n-father", fullName: "Karim Yusupov", birthDate: "1965-03-12", gender: "male", claimedBy: null, metadata: { "Kasbi": "Muhandis" } };
  const m: PersonNode = { id: "n-mother", fullName: "Dilnoza Yusupova", birthDate: "1968-07-04", gender: "female", claimedBy: null };
  const sis: PersonNode = { id: "n-sister", fullName: "Malika Yusupova", birthDate: "1998-11-08", gender: "female", claimedBy: null };
  const c: PersonNode = { id: "n-child", fullName: "Aziz Yusupov", birthDate: "1995-05-20", gender: "male", claimedBy: null };
  return {
    activeTreeId: null,
    user: null,
    trees: [
      {
        id: "t-yusupov",
        name: "Yusupovlar shajarasi",
        ownerId: null,
        nodes: [gf, gm, mgf, mgm, f, m, c, sis],
        edges: [
          { id: "e4", from: gf.id, to: gm.id, type: "spouse" },
          { id: "e5", from: gf.id, to: f.id, type: "parent" },
          { id: "e6", from: gm.id, to: f.id, type: "parent" },
          { id: "e7", from: mgf.id, to: mgm.id, type: "spouse" },
          { id: "e8", from: mgf.id, to: m.id, type: "parent" },
          { id: "e9", from: mgm.id, to: m.id, type: "parent" },
          { id: "e10", from: f.id, to: sis.id, type: "parent" },
          { id: "e11", from: m.id, to: sis.id, type: "parent" },
          { id: "e1", from: f.id, to: m.id, type: "spouse" },
          { id: "e2", from: f.id, to: c.id, type: "parent" },
          { id: "e3", from: m.id, to: c.id, type: "parent" },
        ],
        members: {},
      },
    ],
  };
}

export function loadState(): ShajaraState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as ShajaraState;
    if (!Array.isArray(parsed.trees)) return seedState();
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state: ShajaraState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
