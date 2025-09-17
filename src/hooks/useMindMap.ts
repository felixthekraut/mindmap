import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearDraft } from '../utils/drafts';

import type { Edge, Node } from '@xyflow/react';
import type { MindMap, MindNode, NodeId, ReactFlowNodeData, UndoAction } from '../types';
import { computeTreeLayout } from '../layout';

let idCounter = 1;
const genId = () => `n_${idCounter++}`;
function bumpIdCounterFromMap(m: MindMap) {
  let maxId = 0;
  for (const nid of Object.keys(m.nodes)) {
    const match = /^n_(\d+)$/.exec(nid);
    if (match) {
      const v = parseInt(match[1], 10);
      if (!Number.isNaN(v)) maxId = Math.max(maxId, v);
    }
  }
  if (maxId >= idCounter) idCounter = maxId + 1;
}

export function createInitialMap(title: string, description: string | undefined, bgColor: string): MindMap {
  const rootId = genId();
  const root: MindNode = {
    id: rootId,
    title,
    description,
    parentId: null,
    children: [],
    collapsed: false,
    color: '#ffffff',
  };
  return {
    id: `map_${Date.now()}`,
    title,
    description,
    bgColor,
    rootId,
    nodes: { [rootId]: root },
  };
}

export function useMindMap(initial?: MindMap) {
  const [map, setMap] = useState<MindMap | null>(initial ?? null);
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  const [positions, setPositions] = useState<Record<NodeId, { x: number; y: number }>>({});
  const moveStartRef = useRef<Record<NodeId, { x: number; y: number }>>({});
  const [pendingEditId, setPendingEditId] = useState<NodeId | null>(null);
  type Density = 'comfortable' | 'compact' | 'dense';
  const [layoutDensity, setLayoutDensity] = useState<Density>('compact');
  const layoutOpts = useMemo(() => {
    switch (layoutDensity) {
      case 'dense':
        return { siblingGap: 32, rootChildGap: 40 } as const;
      case 'compact':
        return { siblingGap: 48, rootChildGap: 60 } as const;
      case 'comfortable':
      default:
        return { siblingGap: 80, rootChildGap: 96 } as const;
    }
  }, [layoutDensity]);


  // Load last saved map and positions from localStorage (single-map autosave)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mm:lastMap');
      if (raw) {
        const parsed = JSON.parse(raw) as MindMap;
        setMap(parsed);
        const posRaw = localStorage.getItem('mm:lastPositions');
        if (posRaw) {
          try { setPositions(JSON.parse(posRaw) as Record<NodeId, { x: number; y: number }>) } catch {}
        }
        // bump idCounter so new ids don't collide with restored ones
        let maxId = 0;
        for (const nid of Object.keys(parsed.nodes)) {
          const m = /^n_(\d+)$/.exec(nid);
          if (m) {
            const v = parseInt(m[1], 10);
            if (!Number.isNaN(v)) maxId = Math.max(maxId, v);
          }
        }
        if (maxId >= idCounter) idCounter = maxId + 1;
      }
    } catch {}
  }, []);

  // Persist map to localStorage whenever it changes
  useEffect(() => {
    if (!map) return;
    try { localStorage.setItem('mm:lastMap', JSON.stringify(map)); } catch {}
  }, [map]);

  // Replace map and optionally positions (used by Import JSON)
  const replaceAll = useCallback((nextMap: MindMap, nextPositions?: Record<NodeId, { x: number; y: number }>) => {
    bumpIdCounterFromMap(nextMap);
    setMap(nextMap);
    if (nextPositions) {
      setPositions(nextPositions);
      try { localStorage.setItem('mm:lastPositions', JSON.stringify(nextPositions)); } catch {}
    } else {
      setPositions({});
      try { localStorage.removeItem('mm:lastPositions'); } catch {}
    }
    try { localStorage.setItem('mm:lastMap', JSON.stringify(nextMap)); } catch {}
  }, []);

  // Start a new blank session: clear map, positions, stacks, and saved viewport
  const newBlank = useCallback(() => {
    setMap(null);
    setPositions({});
    setPendingEditId(null);
    undoStack.current = [];
    redoStack.current = [];
    try { localStorage.removeItem('mm:lastMap'); } catch {}
    try { localStorage.removeItem('mm:lastPositions'); } catch {}
    try { localStorage.removeItem('mm:lastViewport'); } catch {}
  }, []);

  // Force focus helper: retries until the new title input exists in the DOM (helps Firefox)
  const focusTitleById = useCallback((targetId: NodeId, attempts: number = 60) => {
    const el = document.getElementById(`mn-title-${targetId}`) as HTMLInputElement | null;
    if (el) {
      el.focus();
      try { (el as any).select?.(); } catch {}
    } else if (attempts > 0) {
      setTimeout(() => focusTitleById(targetId, attempts - 1), 16);
    }
  }, []);

  const layout = useMemo(() => (map ? computeTreeLayout(map, layoutOpts) : {}), [map, layoutOpts]);

  const rfNodes: Node<ReactFlowNodeData>[] = useMemo(() => {
    if (!map) return [];
    return Object.values(map.nodes)
      .filter((n) => layout[n.id])
      .map((n) => {
        const depth = n.parentId === null ? 0 : (layout[n.id] ? Math.abs(Math.round(layout[n.id].x / 220)) : 0);
        const pos = positions[n.id] ?? layout[n.id];
        return {
          id: n.id,
          type: 'mindNode',
          data: {
            id: n.id,
            title: n.title,
            description: n.description,
            collapsed: n.collapsed,
            depth,
            isRoot: n.parentId === null,
            color: n.color,
            parentId: n.parentId,
            pendingEdit: n.id === pendingEditId,
            ui: n.ui,
          },
          position: { x: pos.x, y: pos.y },
          draggable: true,
          selectable: true,
        } satisfies Node<ReactFlowNodeData>;
      });
  }, [map, layout, positions, pendingEditId]);

  const rfEdges: Edge[] = useMemo(() => {
    if (!map) return [];
    const edges: Edge[] = [];
    for (const node of Object.values(map.nodes)) {
      for (const cid of node.children) {
        if (!layout[node.id] || !layout[cid]) continue; // skip hidden
        edges.push({
          id: `${node.id}-${cid}`,
          type: 'floating',
          source: node.id,
          target: cid,
          animated: false,
          style: { strokeWidth: 1.5 },
        });
      }
    }
    return edges;
  }, [map, layout]);

  const setMapAndRelayout = useCallback((updater: (prev: MindMap) => MindMap) => {
    setMap((prev) => (prev ? updater(prev) : prev));
  }, []);

  const addChild = useCallback((parentId: NodeId) => {
    const id: NodeId = genId();
    setMapAndRelayout((prev) => {
      const parent = prev.nodes[parentId];
      const child: MindNode = {
        id,
        title: 'New node',
        description: '',
        parentId: parentId,
        children: [],
        collapsed: false,
        color: parent.color ?? '#ffffff',
      };
      redoStack.current = [];
      undoStack.current.push({ type: 'add-node', nodeId: id, parentId, node: child });
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: child,
          [parentId]: { ...parent, children: [...parent.children, id], collapsed: false },
        },
      };
    });
    setPendingEditId(id);
    setTimeout(() => { focusTitleById(id); }, 0);
    return id;

  }, [setMapAndRelayout, focusTitleById]);

  const addSiblingOf = useCallback((nodeId: NodeId) => {
    const id: NodeId = genId();
    setMapAndRelayout((prev) => {
      const node = prev.nodes[nodeId];
      // If node has no parent (root), add under root
      const parentId = node.parentId ?? prev.rootId;
      const parent = prev.nodes[parentId];
      const sibling: MindNode = {
        id,
        title: 'New node',
        description: '',
        parentId,
        children: [],
        collapsed: false,
        color: parent.color ?? '#ffffff',
      };
      redoStack.current = [];
      undoStack.current.push({ type: 'add-node', nodeId: id, parentId, node: sibling });
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: sibling,
          [parentId]: { ...parent, children: [...parent.children, id] },
        },
      };
    });
    setPendingEditId(id);
    setTimeout(() => { focusTitleById(id); }, 0);
    return id;
  }, [setMapAndRelayout, focusTitleById]);

  const focusEdit = useCallback((id: NodeId | null) => {
    setPendingEditId(id);
  }, []);


  const editNode = useCallback((id: NodeId, updates: Partial<Pick<MindNode, 'title' | 'description' | 'color'>>) => {
    setMapAndRelayout((prev) => {
      const node = prev.nodes[id];
      const nextVals = {
        title: updates.title ?? node.title,
        description: updates.description ?? node.description,
        color: updates.color ?? node.color,
      };
      redoStack.current = [];
      undoStack.current.push({ type: 'edit-node', nodeId: id, previous: { title: node.title, description: node.description, color: node.color }, next: nextVals });
      return { ...prev, nodes: { ...prev.nodes, [id]: { ...node, ...updates } } };
    });
  }, [setMapAndRelayout]);

  const toggleCollapse = useCallback((id: NodeId) => {
    setMapAndRelayout((prev) => {
      const node = prev.nodes[id];
      return { ...prev, nodes: { ...prev.nodes, [id]: { ...node, collapsed: !node.collapsed } } };
    });
  }, [setMapAndRelayout]);

  const setNodeUi = useCallback((id: NodeId, ui: Partial<{ isExpanded: boolean }>) => {
    setMap((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[id];
      if (!node) return prev;
      const nextUi = { ...(node.ui ?? {}), ...ui } as { isExpanded?: boolean };
      return { ...prev, nodes: { ...prev.nodes, [id]: { ...node, ui: nextUi } } };
    });
  }, []);

  function collectSubtree(prev: MindMap, id: NodeId, out: Record<NodeId, MindNode>) {
    const node = prev.nodes[id];
    out[id] = node;
    for (const cid of node.children) collectSubtree(prev, cid, out);
  }

  const deleteNodeCascade = useCallback((id: NodeId) => {
    setMapAndRelayout((prev) => {
      const subtree: Record<NodeId, MindNode> = {};
      collectSubtree(prev, id, subtree);
      const parentId = prev.nodes[id].parentId;
      const nodes = { ...prev.nodes };
      for (const nid of Object.keys(subtree)) { delete nodes[nid]; try { clearDraft(nid); } catch {} }
      if (parentId) {
        nodes[parentId] = {
          ...nodes[parentId],
          children: nodes[parentId].children.filter((x) => x !== id),
        };
      }
      redoStack.current = [];
      undoStack.current.push({ type: 'delete-subtree', parentId, subtreeRootId: id, subtree });
      return { ...prev, nodes };
    });
  }, [setMapAndRelayout]);

  const undo = useCallback(() => {
    setMapAndRelayout((prev) => {
      const action = undoStack.current.pop();
      if (!action) return prev;
      let result = prev;
      switch (action.type) {
        case 'delete-subtree': {
          // restore subtree and reattach to parent
          const nodes = { ...prev.nodes };
          for (const [nid, nn] of Object.entries(action.subtree)) nodes[nid] = { ...nn };
          const root = action.subtree[action.subtreeRootId];
          if (action.parentId) {
            const p = nodes[action.parentId];
            if (!p.children.includes(root.id)) p.children = [...p.children, root.id];
          }
          result = { ...prev, nodes };
          break;
        }
        case 'edit-node': {
          const n = prev.nodes[action.nodeId];
          result = { ...prev, nodes: { ...prev.nodes, [n.id]: { ...n, ...action.previous } } };
          break;
        }
        case 'add-node': {
          const nodes = { ...prev.nodes };
          const parent = nodes[action.parentId];
          delete nodes[action.nodeId];
          parent.children = parent.children.filter((c) => c !== action.nodeId);
          nodes[action.parentId] = { ...parent };
          result = { ...prev, nodes };
          break;
        }
        case 'move-node': {
          const { nodeId, previous } = action;
          setPositions((p) => ({ ...p, [nodeId]: { x: previous.x, y: previous.y } }));
          result = prev;
          break;
        }
        default:
          result = prev;
      }
      // enable redo of the undone action
      redoStack.current.push(action);
      return result;
    });
  }, [setMapAndRelayout]);

  const setMapMeta = useCallback((updates: Partial<Pick<MindMap, 'title' | 'description' | 'bgColor'>>) => {
    setMap((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const redo = useCallback(() => {
    setMapAndRelayout((prev) => {
      const action = redoStack.current.pop();
      if (!action) return prev;
      let result = prev;
      switch (action.type) {
        case 'delete-subtree': {
          const nodes = { ...prev.nodes };
          for (const nid of Object.keys(action.subtree)) delete nodes[nid];
          if (action.parentId && nodes[action.parentId]) {
            const p = nodes[action.parentId];
            nodes[action.parentId] = { ...p, children: p.children.filter((c) => c !== action.subtreeRootId) };
          }
          result = { ...prev, nodes };
          break;
        }
        case 'edit-node': {
          const n = prev.nodes[action.nodeId];
          const nextVals = action.next ?? {};
          result = { ...prev, nodes: { ...prev.nodes, [n.id]: { ...n, ...nextVals } } };
          break;
        }
        case 'add-node': {
          const parent = prev.nodes[action.parentId];
          const node = action.node ?? ({ id: action.nodeId, title: 'New node', description: '', parentId: action.parentId, children: [], collapsed: false, color: parent?.color ?? '#ffffff' } as MindNode);
          result = {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node.id]: node,
              [action.parentId]: { ...parent, children: [...parent.children, node.id] },
            },
          };
          break;
        }
        case 'move-node': {
          if (action.next) {
            const { nodeId, next } = action;
            setPositions((p) => ({ ...p, [nodeId]: { x: next.x, y: next.y } }));
          }
          result = prev;
          break;
        }
        default:
          result = prev;
      }
      // allow undo of this redo
      undoStack.current.push(action);
      return result;
    });
  }, [setMapAndRelayout]);

  const beginNodeMove = useCallback((id: NodeId, x: number, y: number) => {
    const start = positions[id] ?? layout[id] ?? { x, y };
    moveStartRef.current[id] = { x: start.x, y: start.y };
  }, [positions, layout]);

  const updateNodePosition = useCallback((id: NodeId, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const endNodeMove = useCallback((id: NodeId, x: number, y: number) => {
    const start = moveStartRef.current[id];
    delete moveStartRef.current[id];
    if (!start) return;
    if (start.x === x && start.y === y) return;
    setPositions((prev) => {
      const next = { ...prev, [id]: { x, y } };
      try { localStorage.setItem('mm:lastPositions', JSON.stringify(next)); } catch {}
      return next;
    });
    redoStack.current = [];
    undoStack.current.push({ type: 'move-node', nodeId: id, previous: start, next: { x, y } });
  }, []);

  const resetLayout = useCallback(() => {
    setPositions({});
    try { localStorage.removeItem('mm:lastPositions'); } catch {}
  }, []);

  return {
    map,
    rfNodes,
    rfEdges,
    setMap,
    setMapMeta,
    addChild,
    addSiblingOf,
    focusEdit,
    editNode,
    toggleCollapse,
    deleteNodeCascade,
    undo,
    redo,
    updateNodePosition,
    beginNodeMove,
    endNodeMove,
    resetLayout,
    layoutDensity,
    setLayoutDensity,
    replaceAll,
    newBlank,
    setNodeUi,
  } as const;
}

