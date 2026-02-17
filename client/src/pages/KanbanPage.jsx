import { Container, Text } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';
import { useTasks } from '../hooks/useTasks.js';
import { usePanelManager } from '../hooks/usePanelManager.js';
import { useDragAndDrop } from '../hooks/useDragAndDrop.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { KanbanBoard } from '../components/KanbanBoard.jsx';
import { KanbanDebug } from '../components/KanbanDebug.jsx';
import { TaskDetailsPanel } from '../components/TaskDetailPanel.jsx';

import { useEffect } from 'react';

export function KanbanPage({ selectedProject, refreshTrigger }) {
  const { t } = useTranslation();
  const { 
    tasks, 
    loading, 
    taskStatuses, 
    getTasksByStatus,
    refreshTasks 
  } = useTasks(selectedProject);
  
  // Refresh tasks when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshTasks();
    }
  }, [refreshTrigger, refreshTasks]);
  
  // Use custom hooks for better separation of concerns
  const { openPanels, openDetailPanel, closeDetailPanel, updateTaskPanel } = usePanelManager();
  const { handleDragEnd } = useDragAndDrop({ tasks, getTasksByStatus, refreshTasks, selectedProject, taskStatuses });
  const { handleTaskEdit, handlePanelClose, handleTaskSave } = useTaskActions({ 
    refreshTasks, openDetailPanel, closeDetailPanel, updateTaskPanel, selectedProject 
  });

  if (loading) {
    return (
      <Container size="xl" py="xl" mt="md">
        <Text>{t('common.loading')}</Text>
      </Container>
    );
  }

  return (
    <>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', paddingTop: '80px' }}>
        <KanbanBoard
          taskStatuses={taskStatuses}
          getTasksByStatus={getTasksByStatus}
          onTaskEdit={handleTaskEdit}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Debug component */}
      <KanbanDebug
        selectedProject={selectedProject}
        tasks={tasks}
        openPanels={openPanels}
        loading={loading}
        taskStatuses={taskStatuses}
        getTasksByStatus={getTasksByStatus}
      />

      {/* Task Detail Panels */}
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