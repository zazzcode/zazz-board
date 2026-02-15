import { memo } from 'react';
import { BaseEdge, getStraightPath } from '@xyflow/react';

/**
 * Coordination edge: double-stroke line with no arrowhead.
 * Connects coordinated tasks (tasks that must merge/deploy together).
 * Visually distinct from dependency edges (single animated arrows).
 */
function CoordinationEdgeComponent({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const coordinationCode = data?.coordinationCode;
  const label = coordinationCode
    ? coordinationCode.replace(/_/g, ' ')
    : '';

  return (
    <>
      {/* Outer stroke (wider, darker) */}
      <BaseEdge
        id={`${id}-outer`}
        path={edgePath}
        style={{
          stroke: '#228be6',
          strokeWidth: 6,
          strokeOpacity: 0.3,
        }}
      />
      {/* Inner stroke (thinner, brighter) */}
      <BaseEdge
        id={`${id}-inner`}
        path={edgePath}
        style={{
          stroke: '#228be6',
          strokeWidth: 2,
          strokeDasharray: '8 4',
        }}
      />
      {/* Label at midpoint */}
      {label && (
        <text>
          <textPath
            href={`#${id}-inner`}
            startOffset="50%"
            textAnchor="middle"
            style={{
              fontSize: 9,
              fill: '#228be6',
              fontWeight: 600,
            }}
          >
            {label}
          </textPath>
        </text>
      )}
    </>
  );
}

export const CoordinationEdge = memo(CoordinationEdgeComponent);
