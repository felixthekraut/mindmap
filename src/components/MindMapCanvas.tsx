import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, applyNodeChanges, useReactFlow } from '@xyflow/react';
import type { NodeTypes, Node, Edge, NodeChange, EdgeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindNode from './MindNode';
import FloatingEdge from './FloatingEdge';
import type { ReactFlowNodeData } from '../types';

export interface MindMapCanvasProps {
  nodes: Node<ReactFlowNodeData>[];
  edges: Edge[];
  bgColor: string;
  onAddChild: (id: string) => string;
  onAddSibling: (id: string) => string;
  onFocusEdit: (id: string | null) => void;
  onEdit: (id: string, updates: { title?: string; description?: string }) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onNodeMoveStart: (id: string, x: number, y: number) => void;
  onNodeMoveEnd: (id: string, x: number, y: number) => void;
}

export default function MindMapCanvas(props: MindMapCanvasProps) {
  type RFNode = Node<ReactFlowNodeData>;

  const [localNodes, setLocalNodes] = useState<Node<ReactFlowNodeData>[]>(props.nodes);
  useEffect(() => { setLocalNodes(props.nodes); }, [props.nodes]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    mindNode: (np) => (
      <MindNode
        {...np}
        onAddChild={props.onAddChild}
        onAddSibling={props.onAddSibling}
        onFocusEdit={props.onFocusEdit}
        onEdit={props.onEdit}
        onToggle={props.onToggle}
        onDelete={props.onDelete}
      />
    ),
  }), [props.onAddChild, props.onAddSibling, props.onFocusEdit, props.onEdit, props.onToggle, props.onDelete]);

  const onNodesChange = useCallback((changes: NodeChange<RFNode>[]) => {
    setLocalNodes((nds: RFNode[]) => applyNodeChanges<RFNode>(changes, nds));
  }, []);

  const edgeTypes: EdgeTypes = useMemo(() => ({ floating: FloatingEdge }), []);
  const initialZoomDoneRef = useRef(false);


  const AutoCenterer = () => {
    const rf = useReactFlow();
    const lastId = useRef<string | null>(null);
    useEffect(() => {
      const t = localNodes.find((n) => (n.data as any)?.pendingEdit);
      if (!t) return;
      if (lastId.current === t.id) return;
      lastId.current = t.id;
      requestAnimationFrame(() => {
        try {
          const v = rf.getViewport();
          const live = (rf as any).getNode ? (rf as any).getNode(t.id) : null;
          const cx = live?.positionAbsolute ? live.positionAbsolute.x + (live.width ?? 0) / 2 : (t.position?.x ?? 0);
          const cy = live?.positionAbsolute ? live.positionAbsolute.y + (live.height ?? 0) / 2 : (t.position?.y ?? 0);
          rf.setCenter(cx, cy, { zoom: v.zoom, duration: 300 });
        } catch {}
      });
    }, [localNodes, rf]);
    return null;
  };


  return (
    <div style={{ width: '100%', height: '100%', background: props.bgColor, transition: 'background-color 300ms ease' }}>
      <ReactFlow<RFNode, Edge>
        nodes={localNodes}
        edges={props.edges}
        onNodesChange={onNodesChange}
        onNodeDragStart={(_, node: any) => props.onNodeMoveStart(node.id, node.position.x, node.position.y)}
        onNodeDragStop={(_, node: any) => props.onNodeMoveEnd(node.id, node.position.x, node.position.y)}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={{ hideAttribution: true }}
        onInit={(inst) => {
          if (initialZoomDoneRef.current) return;
          initialZoomDoneRef.current = true;
          try {
            const raw = localStorage.getItem('mm:lastViewport');
            if (raw) {
              const vp = JSON.parse(raw);
              inst.setViewport(vp, { duration: 0 });
              return;
            }
          } catch {}
          requestAnimationFrame(() => {
            try {
              inst.zoomOut();
              requestAnimationFrame(() => inst.zoomOut());
            } catch {}
          });
        }}
        onMoveEnd={(_, vp) => { try { localStorage.setItem('mm:lastViewport', JSON.stringify(vp)); } catch {} }}
      >
        <AutoCenterer />
        <Background gap={24} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

