import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch the task graph data for a project or deliverable.
 *
 * @param {string} projectCode – e.g. "APIMOD"
 * @param {number|null} deliverableId – when set, fetches the deliverable-scoped graph
 * @returns {{ graphData, loading, error, refreshGraph }}
 *
 * Polls every 3 seconds so the graph stays live as agents work.
 * TODO: replace polling with SSE for push-based updates.
 */
export function useTaskGraph(projectCode, deliverableId = null) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear graph when the scope changes so stale data isn't shown
  useEffect(() => {
    setGraphData(null);
  }, [projectCode, deliverableId]);

  const fetchGraph = useCallback(async () => {
    if (!projectCode) {
      setGraphData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        setError('No access token found');
        setLoading(false);
        return;
      }

      const url = deliverableId
        ? `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/deliverables/${deliverableId}/graph`
        : `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/graph`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
      } else if (response.status === 401) {
        setError('Access token invalid');
      } else if (response.status === 404) {
        setError('Project not found');
      } else {
        setError(`Failed to fetch graph: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching task graph:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectCode, deliverableId]);

  // Initial fetch + 10-second polling
  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 3000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  return {
    graphData,
    loading,
    error,
    refreshGraph: fetchGraph,
  };
}
