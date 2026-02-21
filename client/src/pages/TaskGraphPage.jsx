import { useState, useCallback, useMemo } from 'react';
import { Container, Text, Loader, Center, Stack, Alert } from '@mantine/core';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from '../hooks/useTranslation.js';
import { useTaskGraph } from '../hooks/useTaskGraph.js';
import { generateGraphLayout } from '../utils/graphLayoutUtils.js';
import { TaskNode } from '../components/graph/TaskNode.jsx';
import { SyncPointNode } from '../components/graph/SyncPointNode.jsx';
import { CoordinationEdge } from '../components/graph/CoordinationEdge.jsx';
import { TaskDetailsPanel } from '../components/TaskDetailPanel.jsx';

// Register custom node and edge types (must be stable references outside render)
const nodeTypes = {
  taskNode: TaskNode,
  syncPointNode: SyncPointNode,
};

const edgeTypes = {
  coordinationEdge: CoordinationEdge,
};

function TaskGraphContent({ selectedProject, selectedDeliverableId }) {
  const { t } = useTranslation();
  const projectCode = selectedProject?.code;

  // Detail panels
  const [openPanels, setOpenPanels] = useState([]);

  const { graphData, loading, error, refreshGraph } = useTaskGraph(projectCode, selectedDeliverableId);

  // Generate layout from API data
  const { nodes, edges } = useMemo(() => {
    if (!graphData || !graphData.tasks) return { nodes: [], edges: [] };

    const direction = graphData.taskGraphLayoutDirection || 'LR';
    const statusWorkflow = selectedProject?.statusWorkflow || [];

    return generateGraphLayout(
      graphData.tasks,
      graphData.relations || [],
      direction,
      graphData.completionCriteriaStatus,
      statusWorkflow
    );
  }, [graphData, selectedProject]);

  // Node click → open detail panel (no duplicates)
  const handleNodeClick = useCallback((event, node) => {
    if (node.type !== 'taskNode') return;
    const task = node.data?.task;
    if (!task) return;
    const panelId = `graph-task-${task.id}`;
    setOpenPanels(prev =>
      prev.some(p => p.id === panelId)
        ? prev
        : [...prev, { id: panelId, task, clickPos: { x: event.clientX, y: event.clientY } }]
    );
  }, []);

  const handlePanelClose = useCallback((panelId) => {
    setOpenPanels(prev => prev.filter(p => p.id !== panelId));
  }, []);

  const handleTaskSave = useCallback(async (panelId, updatedTask) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) return;

      const response = await fetch(
        `http://localhost:3030/projects/${selectedProject.code}/tasks/${updatedTask.id}`,
        {
          method: 'PUT',
          headers: { 'TB_TOKEN': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedTask.title,
            status: updatedTask.status,
            priority: updatedTask.priority,
            storyPoints: updatedTask.storyPoints,
            prompt: updatedTask.prompt,
            isBlocked: updatedTask.isBlocked,
            blockedReason: updatedTask.blockedReason,
            gitWorktree: updatedTask.gitWorktree,
            deliverableId: updatedTask.deliverableId,
            tagNames: updatedTask.tagNames || [],
          }),
        }
      );

      if (response.ok) {
        const savedTask = await response.json();
        setOpenPanels(prev =>
          prev.map(p => p.id === panelId ? { ...p, task: savedTask } : p)
        );
        refreshGraph();
      } else {
        console.error('Failed to save task:', response.status);
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  }, [selectedProject, refreshGraph]);

  const taskStatuses = selectedProject?.statusWorkflow || ['READY', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  // Show full-screen loader
  if (loading && !graphData) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl" mt="md">
        <Alert color="red" title="Error loading task graph">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      {nodes.length === 0 ? (
        <Center style={{ height: 'calc(100vh - 80px)' }}>
          <Stack align="center" gap="md">
            <Text size="xl" c="dimmed">No tasks in graph</Text>
            <Text size="sm" c="dimmed">
              Add tasks with dependencies to see them visualized here.
            </Text>
          </Stack>
        </Center>
      ) : (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', background: '#1a1b1e' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'default', animated: true }}
          >
            <Background color="#2c2e33" gap={20} size={1} variant="dots" />
            <Controls style={{ button: { backgroundColor: '#25262b', color: '#c1c2c5' } }} />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'syncPointNode') return '#868e96';
                if (node.data?.isBlocked) return '#fab005';
                return '#228be6';
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
              style={{ backgroundColor: '#1a1b1e', border: '1px solid #3a3f47' }}
            />
          </ReactFlow>
        </div>
      )}

      {/* Task detail panels */}
      {openPanels.map((panel, index) => (
        <TaskDetailsPanel
          key={panel.id}
          task={panel.task}
          taskStatuses={taskStatuses}
          opened={true}
          onClose={() => handlePanelClose(panel.id)}
          onSave={(updatedTask) => handleTaskSave(panel.id, updatedTask)}
          panelIndex={index}
          initialClickPos={panel.clickPos}
        />
      ))}
    </>
  );
}

export function TaskGraphPage({ selectedProject, selectedDeliverableId }) {
  return (
    <ReactFlowProvider>
      <TaskGraphContent selectedProject={selectedProject} selectedDeliverableId={selectedDeliverableId} />
    </ReactFlowProvider>
  );
}
