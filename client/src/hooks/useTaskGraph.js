import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch the task graph data for a project.
 *
 * @param {string} projectCode – e.g. "APIMOD"
 * @returns {{ graphData, loading, error, refreshGraph }}
 *
 * graphData shape (from GET /projects/:code/graph):
 *   { projectId, projectCode, taskGraphLayoutDirection, completionCriteriaStatus,
 *     tasks[], relations[] }
 */
export function useTaskGraph(projectCode) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      const response = await fetch(
        `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/graph`,
        {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json',
          },
        }
      );

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
  }, [projectCode]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return {
    graphData,
    loading,
    error,
    refreshGraph: fetchGraph,
  };
}
