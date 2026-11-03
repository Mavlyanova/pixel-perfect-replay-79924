import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  assertCanMutate,
  claimNode,
  createNamedTree,
  deleteTree as deleteTreeFn,
  inviteMember,
  renameTree as renameTreeFn,
  switchTree as switchTreeFn,
  userTrees,
  createOwnTree,
  findUnlinkedMatch,
  loadState,
  saveState,
  setMemberRole,
  seedState,
  uid,
  type Edge,
  type Match,
  type PersonNode,
  type Role,
  type ShajaraState,
  type Tree,
  type User,
} from "@/lib/shajara";
import { DEFAULT_LANG, translate, type Lang, type TranslationKey } from "@/i18n/translations";

const LANG_KEY = "shajara:lang";


export type ParentCardViewMode = 'combined' | 'separated';
export type SidebarView = 'default' | 'time-travel' | 'geography';

interface Ctx {
  ready: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
  user: User | null;
  isAuthenticated: boolean;
  activeTree: Tree | null;
  currentRole: Role | null;
  nodes: PersonNode[];
  edges: Edge[];
  beginLogin: (fullName: string, birthDate: string) => { user: User; match: Match | null };
  acceptClaim: (user: User, match: Match) => void;
  startOwnTree: (user: User) => void;
  logout: () => void;
  addNode: (node: Omit<PersonNode, "id" | "claimedBy">) => PersonNode;
  addEdge: (edge: Omit<Edge, "id">) => Edge;
  removeNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<Omit<PersonNode, "id">>) => void;
  removeEdge: (id: string) => void;
  reconnectEdge: (id: string, from: string, to: string) => void;
  changeRole: (userId: string, role: Role) => void;
  myTrees: Tree[];
  switchTree: (id: string) => void;
  createTree: (name: string) => void;
  renameTree: (name: string) => void;
  deleteTree: (id: string) => void;
  invite: (name: string, role: Role) => void;
  parentCardViewMode: ParentCardViewMode;
  setParentCardViewMode: (mode: ParentCardViewMode) => void;
  activeSidebarView: SidebarView;
  setActiveSidebarView: (view: SidebarView) => void;
}

const ShajaraContext = createContext<Ctx | null>(null);

export function ShajaraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShajaraState>(seedState);
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);
  const [parentCardViewMode, setParentCardViewMode] = useState<ParentCardViewMode>("combined");
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>("default");


  useEffect(() => {
    setState(loadState());
    const l = window.localStorage.getItem(LANG_KEY) as Lang | null;
    if (l === "uz" || l === "ru" || l === "en") setLangState(l);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback((k: TranslationKey, vars?: Record<string, string>) => translate(lang, k, vars), [lang]);

  const activeTree = state.trees.find((tr) => tr.id === state.activeTreeId) ?? null;
  const currentRole: Role | null = activeTree && state.user ? activeTree.members[state.user.id] ?? null : null;

  const mutateTree = useCallback(
    (fn: (tree: Tree) => Tree) => {
      assertCanMutate(currentRole);
      setState((s) => {
        const next: ShajaraState = {
          ...s,
          trees: s.trees.map((tr) => (tr.id === s.activeTreeId ? fn(tr) : tr)),
        };
        // Persist immediately so every person or relationship change survives a reload,
        // even before React flushes the save effect.
        saveState(next);
        return next;
      });
    },
    [currentRole],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      lang,
      setLang,
      t,
      user: state.user,
      isAuthenticated: !!state.user && !!activeTree,
      activeTree,
      currentRole,
      nodes: activeTree?.nodes ?? [],
      edges: activeTree?.edges ?? [],
      beginLogin: (fullName, birthDate) => {
        const user: User = { id: uid(), fullName: fullName.trim(), birthDate, nodeId: null };
        return { user, match: findUnlinkedMatch(state.trees, fullName, birthDate) };
      },
      acceptClaim: (user, match) => setState((s) => claimNode(s, match.tree.id, match.node.id, user)),
      startOwnTree: (user) => setState((s) => createOwnTree(s, user)),
      logout: () => setState((s) => ({ ...s, user: null, activeTreeId: null })),
      addNode: (node) => {
        const n: PersonNode = { ...node, id: uid(), claimedBy: null };
        mutateTree((tr) => ({ ...tr, nodes: [...tr.nodes, n] }));
        return n;
      },
      addEdge: (edge) => {
        const e: Edge = { ...edge, id: uid() };
        mutateTree((tr) => ({ ...tr, edges: [...tr.edges, e] }));
        return e;
      },
      removeNode: (id) =>
        mutateTree((tr) => ({
          ...tr,
          nodes: tr.nodes.filter((n) => n.id !== id),
          edges: tr.edges.filter((e) => e.from !== id && e.to !== id),
        })),
      updateNode: (id, patch) =>
        mutateTree((tr) => ({ ...tr, nodes: tr.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      removeEdge: (id) => mutateTree((tr) => ({ ...tr, edges: tr.edges.filter((e) => e.id !== id) })),
      reconnectEdge: (id, from, to) =>
        mutateTree((tr) => ({ ...tr, edges: tr.edges.map((e) => (e.id === id ? { ...e, from, to } : e)) })),
      changeRole: (userId, role) => {
        if (!activeTree) return;
        const next = setMemberRole(activeTree, currentRole, userId, role);
        setState((s) => ({ ...s, trees: s.trees.map((tr) => (tr.id === next.id ? next : tr)) }));
      },
      myTrees: userTrees(state),
      switchTree: (id) => setState((s) => switchTreeFn(s, id)),
      createTree: (name) => setState((s) => createNamedTree(s, name)),
      renameTree: (name) => {
        if (!activeTree) return;
        const next = renameTreeFn(activeTree, currentRole, name);
        setState((s) => ({ ...s, trees: s.trees.map((tr) => (tr.id === next.id ? next : tr)) }));
      },
      deleteTree: (id) => {
        const next = deleteTreeFn(state, id);
        setState(next);
      },
      invite: (name, role) => {
        if (!activeTree) return;
        const next = inviteMember(activeTree, currentRole, name, role);
        setState((s) => ({ ...s, trees: s.trees.map((tr) => (tr.id === next.id ? next : tr)) }));
      },
      parentCardViewMode,
      setParentCardViewMode,
      activeSidebarView,
      setActiveSidebarView,
    }),
    [ready, lang, setLang, t, state, activeTree, currentRole, mutateTree, parentCardViewMode, activeSidebarView],
  );

  return <ShajaraContext.Provider value={value}>{children}</ShajaraContext.Provider>;
}

export function useShajara(): Ctx {
  const ctx = useContext(ShajaraContext);
  if (!ctx) throw new Error("useShajara must be used inside <ShajaraProvider>");
  return ctx;
}
