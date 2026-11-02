import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Connection,
  type Edge as FlowEdge,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import { toast } from "sonner";
import { Download, LayoutGrid } from "lucide-react";
import { useShajara } from "@/context/ShajaraContext";
import { canMutate } from "@/lib/shajara";
import {
  CARD_SIZE,
  DIRECTIONS,
  childrenOf,
  computeBranches,
  computeHidden,
  edgeBranch,
  layoutPositions,
  type Direction,
} from "@/lib/treeLayout";
import { PersonCard, type PersonFlowNode } from "@/components/tree/PersonCard";
import { DetailDrawer } from "@/components/tree/DetailDrawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const nodeTypes: NodeTypes = { person: PersonCard };
type Pos = Record<string, { x: number; y: number }>;

function TreeCanvas() {
  const { t, nodes, edges, user, currentRole, reconnectEdge, removeEdge } = useShajara();
  const canEdit = canMutate(currentRole);
  const rf = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [direction, setDirection] = useState<Direction>("TB");
  const [compact, setCompact] = useState(false);
  const [colorByBranch, setColorByBranch] = useState(true);
  const [ortho, setOrtho] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isolateId, setIsolateId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Pos>({});

  const hidden = useMemo(() => computeHidden(nodes, edges, collapsed, isolateId), [nodes, edges, collapsed, isolateId]);
  const visibleNodes = useMemo(() => nodes.filter((n) => !hidden.has(n.id)), [nodes, hidden]);
  const branches = useMemo(() => computeBranches(nodes, edges, user?.nodeId ?? null), [nodes, edges, user?.nodeId]);

  const relayout = useCallback(() => {
    setPositions(layoutPositions(visibleNodes, edges, direction, compact));
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
  }, [visibleNodes, edges, direction, compact, rf]);

  // Re-layout whenever structure / mode changes.
  const structureKey = `${direction}|${compact}|${visibleNodes.map((n) => n.id).join(",")}|${edges.map((e) => `${e.from}>${e.to}`).join(",")}`;
  useEffect(() => {
    relayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const flowNodes: PersonFlowNode[] = visibleNodes.map((p) => ({
    id: p.id,
    type: "person",
    position: positions[p.id] ?? { x: 0, y: 0 },
    data: {
      person: p,
      direction,
      compact,
      branch: branches.get(p.id) ?? "neutral",
      colorByBranch,
      isSelf: p.id === user?.nodeId,
      hasChildren: childrenOf(edges, p.id).length > 0,
      collapsed: collapsed.has(p.id),
      onToggle: toggle,
      foldLabel: collapsed.has(p.id) ? t("unfold") : t("fold"),
    },
    style: compact ? CARD_SIZE.compact : CARD_SIZE.full,
  }));

  const flowEdges: FlowEdge[] = edges
    .filter((e) => !hidden.has(e.from) && !hidden.has(e.to))
    .map((e) => {
      const branch = colorByBranch ? edgeBranch(branches, e) : "neutral";
      const spouse = e.type === "spouse";
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        sourceHandle: spouse ? "s-out" : undefined,
        targetHandle: spouse ? "s-in" : undefined,
        type: spouse ? "straight" : ortho ? "smoothstep" : "default",
        reconnectable: canEdit && !spouse,
        style: { stroke: `var(--branch-${branch})`, strokeWidth: 2, strokeDasharray: spouse ? "6 4" : undefined },
      };
    });

  const onNodesChange = useCallback((changes: NodeChange<PersonFlowNode>[]) => {
    setPositions((prev) => {
      let next = prev;
      for (const c of changes) {
        if (c.type === "position" && c.position) {
          if (next === prev) next = { ...prev };
          next[c.id] = c.position;
        }
      }
      return next;
    });
  }, []);

  const onReconnect = useCallback(
    (old: FlowEdge, conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return;
      try {
        reconnectEdge(old.id, conn.source, conn.target);
      } catch {
        toast.error(t("viewerWarning"));
      }
    },
    [reconnectEdge, t],
  );

  const onEdgesDelete = useCallback(
    (deleted: FlowEdge[]) => {
      try {
        deleted.forEach((e) => removeEdge(e.id));
      } catch {
        toast.error(t("viewerWarning"));
      }
    },
    [removeEdge, t],
  );

  const exportCanvas = async (format: "png" | "pdf") => {
    const viewportEl = wrapRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportEl || flowNodes.length === 0) return;
    try {
      const { toPng } = await import("html-to-image");
      const bounds = getNodesBounds(rf.getNodes());
      const width = Math.max(800, Math.ceil(bounds.width + 160));
      const height = Math.max(600, Math.ceil(bounds.height + 160));
      const vp = getViewportForBounds(bounds, width, height, 0.1, 2, 0.08);
      const bg = getComputedStyle(document.body).backgroundColor;
      const dataUrl = await toPng(viewportEl, {
        backgroundColor: bg,
        width,
        height,
        pixelRatio: 3,
        style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      });
      if (format === "png") {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "shajara.png";
        a.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: width >= height ? "landscape" : "portrait", unit: "px", format: [width, height] });
        pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
        pdf.save("shajara.pdf");
      }
    } catch (err) {
      console.error(err);
      toast.error(t("exportFailed"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="tree-toolbar">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("direction")}</span>
          <select aria-label={t("direction")} className="field-select" value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            {DIRECTIONS.map((d) => <option key={d} value={d}>{t(`dir${d}` as const)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("edgeStyle")}</span>
          <select aria-label={t("edgeStyle")} className="field-select" value={ortho ? "o" : "c"} onChange={(e) => setOrtho(e.target.value === "o")}>
            <option value="c">{t("edgeCurve")}</option>
            <option value="o">{t("edgeOrtho")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("isolate")}</span>
          <select aria-label={t("isolate")} className="field-select" value={isolateId ?? ""} onChange={(e) => setIsolateId(e.target.value || null)}>
            <option value="">{t("isolateNone")}</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.fullName}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Switch id="compact" checked={compact} onCheckedChange={setCompact} />
          <Label htmlFor="compact">{t("compactMode")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="branch" checked={colorByBranch} onCheckedChange={setColorByBranch} />
          <Label htmlFor="branch">{t("colorByBranch")}</Label>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={relayout}><LayoutGrid className="mr-1 h-4 w-4" />{t("resetLayout")}</Button>
          <Button size="sm" variant="outline" onClick={() => exportCanvas("png")}><Download className="mr-1 h-4 w-4" />{t("exportPng")}</Button>
          <Button size="sm" variant="outline" onClick={() => exportCanvas("pdf")}><Download className="mr-1 h-4 w-4" />{t("exportPdf")}</Button>
        </div>
      </div>

      {hidden.size > 0 && (
        <div role="status" className="tree-banner">
          <span>{t("hiddenMembers", { count: String(hidden.size) })}</span>
          <Button size="sm" variant="ghost" onClick={() => { setCollapsed(new Set()); setIsolateId(null); }}>{t("showAll")}</Button>
        </div>
      )}

      {colorByBranch && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><i className="legend-dot legend-dot--paternal" />{t("paternal")}</span>
          <span className="flex items-center gap-1"><i className="legend-dot legend-dot--maternal" />{t("maternal")}</span>
          <span className="ml-auto">{t("canvasHint")}</span>
        </div>
      )}

      <div ref={wrapRef} className="tree-canvas">
        <ReactFlow<PersonFlowNode, FlowEdge>
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDoubleClick={(_, n) => setSelectedId(n.id)}
          onReconnect={onReconnect}
          onEdgesDelete={onEdgesDelete}
          edgesReconnectable={canEdit}
          deleteKeyCode={canEdit ? ["Delete", "Backspace"] : null}
          nodesConnectable={false}
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={2}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <DetailDrawer nodeId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

export function TreeTab() {
  return (
    <ReactFlowProvider>
      <TreeCanvas />
    </ReactFlowProvider>
  );
}
