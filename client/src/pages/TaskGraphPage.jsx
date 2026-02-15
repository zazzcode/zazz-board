import { useMemo } from 'react';
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

// Register custom node and edge types (must be stable references outside render)
const nodeTypes = {
  taskNode: TaskNode,
  syncPointNode: SyncPointNode,
};

const edgeTypes = {
  coordinationEdge: CoordinationEdge,
};

function TaskGraphContent({ selectedProject }) {
  const { t } = useTranslation();
  const projectCode = selectedProject?.code;
  const { graphData, loading, error } = useTaskGraph(projectCode);

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

  if (loading) {
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

  if (nodes.length === 0) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Stack align="center" gap="md">
          <Text size="xl" c="dimmed">No tasks in graph</Text>
          <Text size="sm" c="dimmed">
            Add tasks with dependencies to see them visualized here.
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 80px)',
        background: '#1a1b1e',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
        }}
      >
        <Background
          color="#2c2e33"
          gap={20}
          size={1}
          variant="dots"
        />
        <Controls
          style={{
            button: { backgroundColor: '#25262b', color: '#c1c2c5' },
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'syncPointNode') return '#868e96';
            if (node.data?.isBlocked) return '#fab005';
            return '#228be6';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{
            backgroundColor: '#1a1b1e',
            border: '1px solid #3a3f47',
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function TaskGraphPage({ selectedProject }) {
  return (
    <ReactFlowProvider>
      <TaskGraphContent selectedProject={selectedProject} />
    </ReactFlowProvider>
  );
}
