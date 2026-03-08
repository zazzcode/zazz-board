import { useState, useEffect, useCallback, useRef } from 'react';

const idsMatch = (a, b) => String(a) === String(b);

/**
 * Hook for managing tasks in a project with deliverables
 * Tasks are now scoped to deliverables: /projects/:code/deliverables/:id/tasks/*
 */
export function useTasks(selectedProject, deliverables = []) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const latestFetchRequestIdRef = useRef(0);
  const mutationVersionRef = useRef(0);

  // Task statuses from project workflow, fallback to default statuses
  const taskStatuses = selectedProject?.statusWorkflow || ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'];

  // Fetch tasks from all deliverables in the project
  useEffect(() => {
    if (!selectedProject || deliverables.length === 0) {
      setTasks([]);
      return;
    }

    const fetchRequestId = ++latestFetchRequestIdRef.current;
    const mutationVersionAtStart = mutationVersionRef.current;
    setLoading(true);
    
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('TB_TOKEN');
        if (!token) {
          console.error('No access token found');
          setLoading(false);
          return;
        }

        // Fetch tasks from all deliverables
        const allTasks = [];
        for (const deliverable of deliverables) {
          const response = await fetch(
            `http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverable.id}/tasks`,
            {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'TB_TOKEN': token,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const deliverableTasks = await response.json();
            allTasks.push(...deliverableTasks);
          } else if (response.status === 401) {
            console.error('Unauthorized - access token invalid');
            if (fetchRequestId === latestFetchRequestIdRef.current) {
              setLoading(false);
            }
            return;
          }
        }
        
        // Sort by status and position
        allTasks.sort((a, b) => {
          const statusA = taskStatuses.indexOf(a.status);
          const statusB = taskStatuses.indexOf(b.status);
          if (statusA !== statusB) return statusA - statusB;
          return (a.position || 0) - (b.position || 0);
        });
        
        const isOutdatedFetch = fetchRequestId !== latestFetchRequestIdRef.current;
        const mutatedDuringFetch = mutationVersionRef.current !== mutationVersionAtStart;
        if (isOutdatedFetch || mutatedDuringFetch) {
          return;
        }

        console.log('Fetched tasks:', allTasks);
        setTasks(allTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      } finally {
        if (fetchRequestId === latestFetchRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchTasks();
  }, [selectedProject, deliverables, taskStatuses]);

  const getTasksByStatus = useCallback((status) => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [tasks]);

  /**
   * Add a new task to a deliverable
   * @param {Object} newTask - Task data (deliverableId required)
   */
  const addTask = useCallback(async (newTask) => {
    try {
      mutationVersionRef.current += 1;
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      if (!newTask.deliverableId) {
        console.error('deliverableId is required to create a task');
        return;
      }

      // Find the deliverable to get its ID
      const deliverable = deliverables.find(d => d.id === newTask.deliverableId);
      if (!deliverable) {
        console.error('Deliverable not found');
        return;
      }

      const response = await fetch(
        `http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverable.id}/tasks`,
        {
          method: 'POST',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newTask)
        }
      );

      if (response.ok) {
        const task = await response.json();
        setTasks(prev => [...prev, task]);
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
      } else {
        console.error('Failed to create task:', response.status);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }, [selectedProject, deliverables]);

  /**
   * Update a task
   * @param {number} taskId - Task ID
   * @param {Object} updates - Fields to update
   */
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      mutationVersionRef.current += 1;
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Find the task to get current values
      const task = tasks.find(t => idsMatch(t.id, taskId));
      if (!task) {
        console.error('Task not found for update');
        return;
      }

      const response = await fetch(
        `http://localhost:3030/projects/${selectedProject.code}/deliverables/${task.deliverableId}/tasks/${task.id}`,
        {
          method: 'PUT',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(t => 
          idsMatch(t.id, taskId) ? updatedTask : t
        ));
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
      } else {
        console.error('Failed to update task:', response.status);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, [tasks, selectedProject]);

  /**
   * Delete a task
   * @param {number} taskId - Task ID
   */
  const deleteTask = useCallback(async (taskId) => {
    try {
      mutationVersionRef.current += 1;
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Find the task to get current values
      const task = tasks.find(t => idsMatch(t.id, taskId));
      if (!task) {
        console.error('Task not found for deletion');
        return;
      }

      const response = await fetch(
        `http://localhost:3030/projects/${selectedProject.code}/deliverables/${task.deliverableId}/tasks/${task.id}`,
        {
          method: 'DELETE',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setTasks(prev => prev.filter(t => !idsMatch(t.id, taskId)));
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
      } else {
        console.error('Failed to delete task:', response.status);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [tasks, selectedProject]);

  const moveTask = useCallback((taskId, newStatus) => {
    updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const refreshTasks = useCallback(async () => {
    if (!selectedProject || deliverables.length === 0) return;
    
    const fetchRequestId = ++latestFetchRequestIdRef.current;
    const mutationVersionAtStart = mutationVersionRef.current;
    setLoading(true);
    
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Fetch tasks from all deliverables
      const allTasks = [];
      for (const deliverable of deliverables) {
        const response = await fetch(
          `http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverable.id}/tasks`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'TB_TOKEN': token,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const deliverableTasks = await response.json();
          allTasks.push(...deliverableTasks);
        } else if (response.status === 401) {
          console.error('Unauthorized - access token invalid');
          if (fetchRequestId === latestFetchRequestIdRef.current) {
            setLoading(false);
          }
          return;
        }
      }

      // Sort by status and position
      allTasks.sort((a, b) => {
        const statusA = taskStatuses.indexOf(a.status);
        const statusB = taskStatuses.indexOf(b.status);
        if (statusA !== statusB) return statusA - statusB;
        return (a.position || 0) - (b.position || 0);
      });

      const isOutdatedFetch = fetchRequestId !== latestFetchRequestIdRef.current;
      const mutatedDuringFetch = mutationVersionRef.current !== mutationVersionAtStart;
      if (isOutdatedFetch || mutatedDuringFetch) {
        return;
      }

      console.log('Refreshed tasks:', allTasks);
      setTasks(allTasks);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      if (fetchRequestId === latestFetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedProject, deliverables, taskStatuses]);

  return {
    tasks,
    loading,
    taskStatuses,
    getTasksByStatus,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks
  };
}
