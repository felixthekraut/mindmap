import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

// A minimal floating edge that automatically picks left/right attachment
// based on relative x positions of source and target nodes. It connects
// at the midpoint of the corresponding vertical side of each node box.

function getNodeCenterXY(node: any) {
  const x = (node?.positionAbsolute?.x ?? node?.position?.x ?? 0) + (node?.width ?? 0) / 2;
  const y = (node?.positionAbsolute?.y ?? node?.position?.y ?? 0) + (node?.height ?? 0) / 2;
  return { x, y };
}

function getSidePoint(node: any, side: 'left' | 'right') {
  const xBase = node?.positionAbsolute?.x ?? node?.position?.x ?? 0;
  const yBase = node?.positionAbsolute?.y ?? node?.position?.y ?? 0;
  const w = node?.width ?? 150;
  const h = node?.height ?? 48;
  return {
    x: side === 'left' ? xBase : xBase + w,
    y: yBase + h / 2,
  };
}

export default memo(function FloatingEdge(props: EdgeProps) {
  const { getNode } = useReactFlow();
  const sourceNode = props.source ? getNode(props.source) : null;
  const targetNode = props.target ? getNode(props.target) : null;

  // Fallback to a straight line if nodes are missing
  if (!sourceNode || !targetNode) {
    const [path] = getBezierPath({
      sourceX: props.sourceX!, sourceY: props.sourceY!, sourcePosition: 'right' as any,
      targetX: props.targetX!, targetY: props.targetY!, targetPosition: 'left' as any,
      curvature: 0.35,
    });
    return <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />;
  }

  const sc = getNodeCenterXY(sourceNode);
  const tc = getNodeCenterXY(targetNode);
  const sourceSide: 'left' | 'right' = (tc.x >= sc.x ? 'right' : 'left');
  const targetSide: 'left' | 'right' = (tc.x >= sc.x ? 'left' : 'right');

  const sp = getSidePoint(sourceNode, sourceSide);
  const tp = getSidePoint(targetNode, targetSide);

  const [path] = getBezierPath({
    sourceX: sp.x, sourceY: sp.y, sourcePosition: sourceSide as any,
    targetX: tp.x, targetY: tp.y, targetPosition: targetSide as any,
    curvature: 0.35,
  });

  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />
      {props.label ? (
        <EdgeLabelRenderer>
          <div className="mm-edge-label" style={{ transform: `translate(-50%, -50%) translate(${(sp.x + tp.x) / 2}px, ${(sp.y + tp.y) / 2}px)` }}>
            {props.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

