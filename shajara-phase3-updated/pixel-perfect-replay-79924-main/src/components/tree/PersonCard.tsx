import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import type { PersonNode } from "@/lib/shajara";
import { lifespan, type Branch, type Direction } from "@/lib/treeLayout";

export type PersonData = {
  person: PersonNode;
  direction: Direction;
  compact: boolean;
  branch: Branch;
  colorByBranch: boolean;
  isSelf: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  onToggle: (id: string) => void;
  foldLabel: string;
};
export type PersonFlowNode = Node<PersonData, "person">;

const HANDLES: Record<Direction, { target: Position; source: Position; sIn: Position; sOut: Position }> = {
  TB: { target: Position.Top, source: Position.Bottom, sIn: Position.Left, sOut: Position.Right },
  BT: { target: Position.Bottom, source: Position.Top, sIn: Position.Left, sOut: Position.Right },
  LR: { target: Position.Left, source: Position.Right, sIn: Position.Top, sOut: Position.Bottom },
  RL: { target: Position.Right, source: Position.Left, sIn: Position.Top, sOut: Position.Bottom },
};

function PersonCardImpl({ data }: NodeProps<PersonFlowNode>) {
  const { person, direction, compact, branch, colorByBranch, isSelf, hasChildren, collapsed, onToggle, foldLabel } = data;
  const h = HANDLES[direction];
  const tone = colorByBranch ? `person-card--${branch}` : "";
  return (
    <div className={`person-card ${tone} ${isSelf ? "person-card--self" : ""} ${compact ? "person-card--compact" : ""}`}>
      <Handle type="target" position={h.target} className="person-handle" />
      <Handle type="source" position={h.source} className="person-handle" />
      <Handle type="target" id="s-in" position={h.sIn} className="person-handle person-handle--spouse" />
      <Handle type="source" id="s-out" position={h.sOut} className="person-handle person-handle--spouse" />
      {!compact && (
        <div className="person-avatar">
          {person.avatarUrl ? <img src={person.avatarUrl} alt={person.fullName} /> : <User className="h-6 w-6" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-tight">{person.fullName}</p>
        <p className="text-xs text-muted-foreground">{lifespan(person)}</p>
      </div>
      {hasChildren && (
        <button
          type="button"
          aria-label={foldLabel}
          title={foldLabel}
          className="nodrag rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(person.id);
          }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

export const PersonCard = memo(PersonCardImpl);
