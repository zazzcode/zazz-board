import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getStatusColor, NODE_WIDTH, NODE_HEIGHT } from '../../utils/graphLayoutUtils.js';

/**
 * Custom React Flow node for tasks.
 *
 * Renders a rounded rectangle with:
 * - Task ID badge (top-left)
 * - Title (truncated)
 * - Status color strip (left edge)
 * - Priority indicator (top-right)
 * - Yellow border when blocked past READY
 * - Blue tint when coordinated
 */
function TaskNodeComponent({ data }) {
  const { task, isBlocked, isCoordinated, isComplete } = data;
  const statusColor = getStatusColor(task.status);

  const priorityColors = {
    CRITICAL: '#ff4757',
    HIGH: '#ff6b6b',
    MEDIUM: '#ffa502',
    LOW: '#3742fa',
  };

  const priorityLabels = {
    CRITICAL: '!!!',
    HIGH: '!!',
    MEDIUM: '!',
    LOW: '↓',
  };

  // Build border style — priority: blocked (yellow) > complete (green) > ready (blue) > default
  let borderColor = '#3a3f47';
  let boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  if (isBlocked) {
    borderColor = '#fab005';
    boxShadow = '0 0 12px rgba(250, 176, 5, 0.4)';
  } else if (isComplete) {
    borderColor = '#40c057';
    boxShadow = '0 0 10px rgba(64, 192, 87, 0.35)';
  } else if (task.status === 'READY') {
    borderColor = '#228be6';
    boxShadow = '0 0 8px rgba(34, 139, 230, 0.25)';
  }

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderRadius: 12,
        border: `2px solid ${borderColor}`,
        background: '#25262b',
        boxShadow,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Status color strip */}
      <div
        style={{
          width: 6,
          minWidth: 6,
          background: statusColor,
          borderRadius: '10px 0 0 10px',
        }}
      />

      {/* Content area */}
      <div
        style={{
          flex: 1,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Top row: phaseStep centered + priority right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            minHeight: 18,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              fontWeight: 700,
              color: statusColor,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}
          >
            {task.phaseStep || `#${task.id}`}
          </span>
          {task.priority && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 700,
                color: priorityColors[task.priority] || '#868e96',
                background: 'rgba(0,0,0,0.3)',
                padding: '1px 5px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {priorityLabels[task.priority] || ''}
            </span>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#c1c2c5',
            lineHeight: '1.3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
          title={task.title}
        >
          {task.title}
        </div>

        {/* Bottom row: status label + assignee */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              opacity: 0.8,
            }}
          >
            {task.status.replace(/_/g, ' ')}
          </span>
          {task.agentName && (
            <span
              style={{
                fontSize: 9,
                color: '#909296',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 80,
              }}
              title={task.agentName}
            >
              {task.agentName}
            </span>
          )}
        </div>
      </div>

      {/* React Flow handles — left/right for dependency edges */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: '#5c5f66',
          border: '2px solid #25262b',
        }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: '#5c5f66',
          border: '2px solid #25262b',
        }}
      />
      {/* Top/bottom handles for vertical coordination edges */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: '#228be6',
          border: '2px solid #25262b',
          opacity: isCoordinated ? 1 : 0,
        }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: '#228be6',
          border: '2px solid #25262b',
          opacity: isCoordinated ? 1 : 0,
        }}
      />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
