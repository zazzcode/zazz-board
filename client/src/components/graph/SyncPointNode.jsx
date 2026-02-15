import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { SYNC_NODE_SIZE } from '../../utils/graphLayoutUtils.js';

/**
 * Sync-point node rendered as a diamond/rhombus.
 * Appears when a task has 2+ dependencies — represents "wait for all".
 */
function SyncPointNodeComponent({ data }) {
  const size = SYNC_NODE_SIZE;
  const half = size / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
      title={`Waiting for ${data.count} tasks`}
    >
      {/* Diamond shape via rotated square */}
      <div
        style={{
          width: size * 0.7,
          height: size * 0.7,
          background: '#2c2e33',
          border: '2px solid #868e96',
          transform: 'rotate(45deg)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: -(size * 0.7) / 2,
          marginLeft: -(size * 0.7) / 2,
          borderRadius: 3,
        }}
      />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 6,
          height: 6,
          background: '#868e96',
          border: 'none',
          left: -3,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 6,
          height: 6,
          background: '#868e96',
          border: 'none',
          right: -3,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}

export const SyncPointNode = memo(SyncPointNodeComponent);
