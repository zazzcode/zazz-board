import { useEffect } from 'react';

export function KanbanDebug({ selectedProject, tasks, openModals, loading, taskStatuses, getTasksByStatus }) {
  // Debug info for Kanban board
  useEffect(() => {
    if (selectedProject && !loading) {
      console.log('=== KANBAN DEBUG ===');
      console.log('Project:', selectedProject.title, `(${selectedProject.code})`);
      console.log('Total Tasks:', tasks.length);
      console.log('Open Modals:', openModals.length);
      taskStatuses.forEach(status => {
        const statusTasks = getTasksByStatus(status);
        console.log(`${status}:`, statusTasks.length, 'tasks');
      });
      console.log('LOCALE:', navigator.language);
      console.log('===================');
    }
  }, [selectedProject, tasks, openModals, loading, taskStatuses, getTasksByStatus]);

  return null; // This component doesn't render anything
}
