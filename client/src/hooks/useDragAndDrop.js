import { useCallback } from 'react';

export function useDragAndDrop({ tasks, getTasksByStatus, refreshTasks, selectedProject }) {
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeTask = tasks.find(task => task.id === active.id);
    if (!activeTask) {
      return;
    }

    // Determine target column
    const overTask = tasks.find(task => task.id === over.id);
    let targetColumn;
    let isDroppingOnColumn = false;
    
    if (overTask) {
      // Dropping on a specific task
      targetColumn = overTask.status;
      isDroppingOnColumn = false;
    } else {
      // Dropping on the column itself (over.id is the column status)
      targetColumn = over.id;
      isDroppingOnColumn = true;
    }

    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // If same status, we're reordering within the column
      if (activeTask.status === targetColumn) {
        console.log(`Reordering task ${activeTask.taskId} within column ${targetColumn}`);
        
        const columnTasks = getTasksByStatus(targetColumn);
        const currentIndex = columnTasks.findIndex(t => t.id === active.id);
        
        let overIndex;
        if (isDroppingOnColumn) {
          // Dropping on the column itself - put at the end
          overIndex = columnTasks.length;
        } else {
          // Dropping on a specific task
          overIndex = columnTasks.findIndex(t => t.id === over.id);
        }
        
        // Create new order with dragged task at target position
        const newOrder = [...columnTasks];
        const draggedTask = newOrder.splice(currentIndex, 1)[0];
        newOrder.splice(overIndex, 0, draggedTask);
        
        // Assign new positions with 10-unit gaps
        const positionUpdates = newOrder.map((task, index) => ({
          taskId: task.id,
          newPosition: (index + 1) * 10
        }));
        
        const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/kanban/tasks/column/${targetColumn}/positions`, {
          method: 'PATCH',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ positionUpdates })
        });

        if (response.ok) {
          console.log(`Task ${activeTask.taskId} reordered in ${targetColumn}`);
          await refreshTasks();
        } else {
          console.error('Failed to reorder task');
        }
      } else {
        // Different status - moving between columns
        console.log(`Moving task ${activeTask.taskId} from ${activeTask.status} to ${targetColumn}`);
        
        // Use the project-scoped status change API with taskId
        const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/tasks/${activeTask.taskId}/status`, {
          method: 'PATCH',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: targetColumn
          })
        });

        if (response.ok) {
          console.log(`Task ${activeTask.taskId} moved to ${targetColumn}`);
          await refreshTasks();
        } else {
          console.error('Failed to move task');
        }
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  }, [tasks, getTasksByStatus, refreshTasks, selectedProject]);

  return { handleDragEnd };
}
