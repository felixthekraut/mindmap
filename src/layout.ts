import type { MindMap, NodeId, LayoutNode } from './types';

interface LayoutOptions {
  levelGap?: number; // horizontal gap per depth
  siblingGap?: number; // vertical gap between sibling subtrees
  rootChildGap?: number; // vertical gap between top-level branches (children of root)
  nodeHeight?: number; // approximate node height for spacing heuristics
}

// Two-sided tidy tree layout (mind-map style):
// - Root at (0,0)
// - First-level branches split left/right (alternating by order)
// - Each branch laid out using a compact "tidy-lite" algorithm that centers parents over children
export function computeTreeLayout(
  map: MindMap,
  options: LayoutOptions = {}
): Record<NodeId, LayoutNode> {
  const levelGap = options.levelGap ?? 220;
  const siblingGap = options.siblingGap ?? 80;
  const rootChildGap = options.rootChildGap ?? Math.round(siblingGap * 1.2);

  const pos: Record<NodeId, LayoutNode> = {};
  const rootId = map.rootId;

  // Filter out nodes that are descendants of collapsed nodes
  const visible = new Set<NodeId>();
  function collectVisible(id: NodeId) {
    visible.add(id);
    const node = map.nodes[id];
    if (!node) return;
    if (node.collapsed) return;
    for (const cid of node.children) collectVisible(cid);
  }
  collectVisible(rootId);

  // Helper to get visible children preserving order
  function getVisibleChildren(id: NodeId): NodeId[] {
    const node = map.nodes[id];
    if (!node || node.collapsed) return [];
    return node.children.filter((cid) => visible.has(cid));
  }

  // Local tidy-lite for a subtree: returns list of relative placements and the subtree height span
  type RelPos = { id: NodeId; depth: number; y: number };
  function layoutSubtree(id: NodeId, depth: number): { nodes: RelPos[]; span: number } {
    const children = getVisibleChildren(id);
    if (children.length === 0) {
      return { nodes: [{ id, depth, y: 0 }], span: siblingGap }; // leaf occupies one gap unit
    }

    const childLayouts = children.map((cid) => layoutSubtree(cid, depth + 1));
    const totalSpan = childLayouts.reduce((acc, c) => acc + c.span, 0) + siblingGap * (children.length - 1);

    // Position child blocks stacked and centered around 0
    const nodes: RelPos[] = [];
    let cursor = -totalSpan / 2;
    for (const cl of childLayouts) {
      const center = cursor + cl.span / 2;
      for (const n of cl.nodes) nodes.push({ ...n, y: n.y + center });
      cursor += cl.span + siblingGap;
    }

    // Parent sits at the average of children (which is 0 by construction)
    nodes.push({ id, depth, y: 0 });
    return { nodes, span: Math.max(siblingGap, totalSpan) };
  }

  // Split first-level children left/right (alternating)
  const rootChildren = getVisibleChildren(rootId);
  const rightChildren: NodeId[] = [];
  const leftChildren: NodeId[] = [];
  rootChildren.forEach((cid, i) => (i % 2 === 0 ? rightChildren : leftChildren).push(cid));

  // Root at (0,0)
  pos[rootId] = { id: rootId, x: 0, y: 0 };

  // Layout and pack subtrees for each side
  function placeSide(children: NodeId[], sign: 1 | -1) {
    const layouts = children.map((cid) => layoutSubtree(cid, 1));
    const total = layouts.reduce((acc, l) => acc + l.span, 0) + (layouts.length > 0 ? rootChildGap * (layouts.length - 1) : 0);
    let cursor = -total / 2;
    for (let idx = 0; idx < children.length; idx++) {
      const lay = layouts[idx];
      const center = cursor + lay.span / 2;
      for (const n of lay.nodes) {
        pos[n.id] = {
          id: n.id,
          x: sign * (n.depth * levelGap),
          y: n.y + center,
        };
      }
      cursor += lay.span + rootChildGap;
    }
  }

  placeSide(rightChildren, 1);
  placeSide(leftChildren, -1);

  return pos;
}

