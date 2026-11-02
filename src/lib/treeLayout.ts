import dagre from "@dagrejs/dagre";
import type { Edge, PersonNode } from "@/lib/shajara";

export type Direction = "TB" | "BT" | "LR" | "RL";
export const DIRECTIONS: Direction[] = ["TB", "BT", "LR", "RL"];
export type Branch = "paternal" | "maternal" | "neutral";

export const CARD_SIZE = { full: { width: 220, height: 96 }, compact: { width: 170, height: 44 } };

export function parentsOf(edges: Edge[], id: string): string[] {
  return edges.filter((e) => e.type === "parent" && e.to === id).map((e) => e.from);
}
export function childrenOf(edges: Edge[], id: string): string[] {
  return edges.filter((e) => e.type === "parent" && e.from === id).map((e) => e.to);
}
export function spousesOf(edges: Edge[], id: string): string[] {
  return edges
    .filter((e) => e.type === "spouse" && (e.from === id || e.to === id))
    .map((e) => (e.from === id ? e.to : e.from));
}

function walk(start: string[], next: (id: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...start];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...next(id));
  }
  return seen;
}

export const ancestorsOf = (edges: Edge[], id: string) => {
  const s = walk(parentsOf(edges, id), (x) => parentsOf(edges, x));
  s.delete(id);
  return s;
};
export const descendantsOf = (edges: Edge[], id: string) => {
  const s = walk(childrenOf(edges, id), (x) => childrenOf(edges, x));
  s.delete(id);
  return s;
};

/** Ids hidden by folded branches and/or the isolation filter. */
export function computeHidden(
  nodes: PersonNode[],
  edges: Edge[],
  collapsed: Set<string>,
  isolateId: string | null,
): Set<string> {
  const hidden = new Set<string>();
  collapsed.forEach((id) => descendantsOf(edges, id).forEach((d) => hidden.add(d)));
  if (isolateId && nodes.some((n) => n.id === isolateId)) {
    const keep = new Set<string>([isolateId, ...ancestorsOf(edges, isolateId), ...descendantsOf(edges, isolateId), ...spousesOf(edges, isolateId)]);
    nodes.forEach((n) => !keep.has(n.id) && hidden.add(n.id));
  }
  return hidden;
}

/** Paternal = father + his ancestors, maternal = mother + her ancestors, relative to focus. */
export function computeBranches(nodes: PersonNode[], edges: Edge[], focusId: string | null): Map<string, Branch> {
  const map = new Map<string, Branch>();
  nodes.forEach((n) => map.set(n.id, "neutral"));
  if (!focusId) return map;
  const parents = parentsOf(edges, focusId).map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as PersonNode[];
  const father = parents.find((p) => p.gender === "male");
  const mother = parents.find((p) => p.gender === "female");
  if (father) [father.id, ...ancestorsOf(edges, father.id)].forEach((id) => map.set(id, "paternal"));
  if (mother) [mother.id, ...ancestorsOf(edges, mother.id)].forEach((id) => map.set(id, "maternal"));
  return map;
}

export function edgeBranch(branches: Map<string, Branch>, edge: Edge): Branch {
  const a = branches.get(edge.from) ?? "neutral";
  const b = branches.get(edge.to) ?? "neutral";
  if (edge.type === "spouse") return a === b ? a : "neutral";
  return a;
}

/** Minimum gap (px) between spouses placed side by side. */
export const SPOUSE_GAP = 80;

/**
 * Couples (connected by spouse edges) are laid out as one dagre unit, so partners always sit
 * side by side on the same rank with exactly SPOUSE_GAP between cards, and parent→child lines
 * leave the couple's centre instead of crossing over one partner.
 */
export function layoutPositions(
  nodes: PersonNode[],
  edges: Edge[],
  direction: Direction,
  compact: boolean,
): Record<string, { x: number; y: number }> {
  const size = compact ? CARD_SIZE.compact : CARD_SIZE.full;
  const horizontal = direction === "TB" || direction === "BT";
  const ids = new Set(nodes.map((n) => n.id));
  const visible = edges.filter((e) => ids.has(e.from) && ids.has(e.to));

  // Group spouses into units (male partner first for a stable order).
  const unitOf = new Map<string, string>();
  const units = new Map<string, string[]>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (unitOf.has(n.id)) continue;
    const members = [...walk([n.id], (x) => spousesOf(visible, x))];
    members.sort((a, b) => (byId.get(a)!.gender === "male" ? 0 : 1) - (byId.get(b)!.gender === "male" ? 0 : 1));
    units.set(n.id, members);
    members.forEach((m) => unitOf.set(m, n.id));
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: SPOUSE_GAP, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));
  units.forEach((members, uid) => {
    const k = members.length;
    g.setNode(
      uid,
      horizontal
        ? { width: k * size.width + (k - 1) * SPOUSE_GAP, height: size.height }
        : { width: size.width, height: k * size.height + (k - 1) * SPOUSE_GAP },
    );
  });
  visible.forEach((e) => {
    if (e.type !== "parent") return;
    const a = unitOf.get(e.from)!;
    const b = unitOf.get(e.to)!;
    if (a !== b && !g.hasEdge(a, b)) g.setEdge(a, b);
  });
  dagre.layout(g);

  const out: Record<string, { x: number; y: number }> = {};
  units.forEach((members, uid) => {
    const p = g.node(uid);
    const left = p.x - p.width / 2;
    const top = p.y - p.height / 2;
    members.forEach((m, i) => {
      out[m] = horizontal
        ? { x: left + i * (size.width + SPOUSE_GAP), y: top }
        : { x: left, y: top + i * (size.height + SPOUSE_GAP) };
    });
  });
  return out;
}

export function lifespan(n: Pick<PersonNode, "birthDate" | "deathDate">): string {
  const b = n.birthDate?.slice(0, 4) || "?";
  return n.deathDate ? `${b} – ${n.deathDate.slice(0, 4)}` : `${b} –`;
}
