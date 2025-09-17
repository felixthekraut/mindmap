export type NodeId = string;

export interface MindNode {
  id: NodeId;
  title: string;
  description?: string;
  parentId: NodeId | null;
  children: NodeId[];
  collapsed: boolean;
  color?: string;
  // UI-only settings (persist user intent, not pixel heights)
  ui?: { isExpanded?: boolean };
}

export interface MindMapMeta {
  id: string;
  title: string;
  description?: string;
  bgColor: string;
}

export interface MindMap extends MindMapMeta {
  rootId: NodeId;
  nodes: Record<NodeId, MindNode>;
}

export interface LayoutNode {
  id: NodeId;
  x: number;
  y: number;
}

export interface ReactFlowNodeData extends Record<string, unknown> {
  id: NodeId;
  title: string;
  description?: string;
  collapsed: boolean;
  depth: number;
  isRoot: boolean;
  color?: string;
  parentId: NodeId | null;
  pendingEdit?: boolean;
  ui?: { isExpanded?: boolean };
}

export type UndoAction =
  | { type: 'delete-subtree'; parentId: NodeId | null; subtreeRootId: NodeId; subtree: Record<NodeId, MindNode> }
  | { type: 'edit-node'; nodeId: NodeId; previous: Pick<MindNode, 'title' | 'description' | 'color'>; next: Pick<MindNode, 'title' | 'description' | 'color'> }
  | { type: 'add-node'; nodeId: NodeId; parentId: NodeId; node?: MindNode }
  | { type: 'move-node'; nodeId: NodeId; previous: { x: number; y: number }; next?: { x: number; y: number } };

