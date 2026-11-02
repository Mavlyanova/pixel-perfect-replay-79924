import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  assertCanMutate,
  claimNode,
  createOwnTree,
  findUnlinkedMatch,
  loadState,
  saveState,
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
}

const ShajaraContext = createContext<Ctx | null>(null);

export function ShajaraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShajaraState>(seedState);
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

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
      setState((s) => ({ ...s, trees: s.trees.map((tr) => (tr.id === s.activeTreeId ? fn(tr) : tr)) }));
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
    }),
    [ready, lang, setLang, t, state, activeTree, currentRole, mutateTree],
  );

  return <ShajaraContext.Provider value={value}>{children}</ShajaraContext.Provider>;
}

export function useShajara(): Ctx {
  const ctx = useContext(ShajaraContext);
  if (!ctx) throw new Error("useShajara must be used inside <ShajaraProvider>");
  return ctx;
}
