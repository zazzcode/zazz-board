import { useCallback, useEffect, useRef, useState } from 'react';

function getTokenHeaders() {
  const token = localStorage.getItem('TB_TOKEN');
  if (!token) return null;

  return {
    'TB_TOKEN': token,
    'Content-Type': 'application/json',
  };
}

export function useProjectGantt(projectCode) {
  const [ganttData, setGanttData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestRequestIdRef = useRef(0);

  const refreshGantt = useCallback(async () => {
    if (!projectCode) {
      setGanttData(null);
      return null;
    }

    const headers = getTokenHeaders();
    if (!headers) {
      setError('No access token found');
      return null;
    }

    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/gantt`,
        {
          method: 'GET',
          cache: 'no-store',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch project Gantt: ${response.status}`);
      }

      const data = await response.json();
      if (requestId !== latestRequestIdRef.current) return null;
      setGanttData(data);
      return data;
    } catch (fetchError) {
      if (requestId === latestRequestIdRef.current) {
        setError(fetchError.message);
        setGanttData(null);
      }
      return null;
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [projectCode]);

  const loadDeliverableTasks = useCallback(async (deliverableId) => {
    if (!projectCode || !deliverableId) return null;

    const headers = getTokenHeaders();
    if (!headers) {
      setError('No access token found');
      return null;
    }

    try {
      const response = await fetch(
        `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/gantt/deliverables/${encodeURIComponent(deliverableId)}/tasks`,
        {
          method: 'GET',
          cache: 'no-store',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch deliverable Gantt tasks: ${response.status}`);
      }

      return await response.json();
    } catch (fetchError) {
      setError(fetchError.message);
      return null;
    }
  }, [projectCode]);

  useEffect(() => {
    refreshGantt();
  }, [refreshGantt]);

  return {
    ganttData,
    loading,
    error,
    refreshGantt,
    loadDeliverableTasks,
  };
}
