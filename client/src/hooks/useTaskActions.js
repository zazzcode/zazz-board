import { useCallback } from 'react';

export function useTaskActions({ refreshTasks, openModal, closeModal, updateModalTask, selectedProject }) {
  const handleTaskEdit = useCallback((task) => {
    const modalId = `edit-${task.id}`;
    openModal(modalId, task);
  }, [openModal]);

  const handleModalClose = useCallback((modalId) => {
    closeModal(modalId);
  }, [closeModal]);

  const handleTaskSave = useCallback(async (modalId, updatedTask) => {
    try {
      // Make API call to save task using project-scoped endpoint
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/tasks/${updatedTask.taskId}`, {
        method: 'PUT',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: updatedTask.title,
          status: updatedTask.status,
          priority: updatedTask.priority,
          storyPoints: updatedTask.storyPoints,
          assigneeId: updatedTask.assigneeId,
          prompt: updatedTask.prompt,
          isBlocked: updatedTask.isBlocked,
          blockedReason: updatedTask.blockedReason,
          gitFeatureBranch: updatedTask.gitFeatureBranch,
          gitPullRequestUrl: updatedTask.gitPullRequestUrl,
          tagNames: updatedTask.tagNames || []
        })
      });

      if (response.ok) {
        const savedTask = await response.json();
        
        // Update the task in the modal
        updateModalTask(modalId, savedTask);
        
        // Refresh tasks to update the board
        await refreshTasks();
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
        if (window.showToast) {
          window.showToast('error', 'Access token invalid. Please reload your access token.');
        } else {
          alert('Access token invalid. Please reload your access token.');
        }
      } else {
        console.error('Failed to save task:', response.status);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }, [refreshTasks, updateModalTask, selectedProject]);

  return { handleTaskEdit, handleModalClose, handleTaskSave };
}
