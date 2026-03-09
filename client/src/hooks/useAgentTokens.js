import { useCallback, useEffect, useMemo, useState } from 'react';

function getToken() {
  return localStorage.getItem('TB_TOKEN');
}

async function fetchJson(url, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'TB_TOKEN': token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function useAgentTokens(selectedProject, currentUser, opened) {
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshAgentTokens = useCallback(async () => {
    if (!selectedProject || !opened) {
      setUserGroups([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Always fetch only current user's tokens (no leader "all users" view)
      const url = `http://localhost:3030/projects/${selectedProject.code}/users/me/agent-tokens`;
      const data = await fetchJson(url, { method: 'GET' });
      const groups = data ? [data] : [];
      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching agent tokens:', error);
      setUserGroups([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [opened, selectedProject]);

  useEffect(() => {
    refreshAgentTokens();
  }, [refreshAgentTokens]);

  const createAgentToken = useCallback(async ({ userId, label }) => {
    if (!selectedProject) return null;

    const targetUserId = userId || 'me';
    const created = await fetchJson(
      `http://localhost:3030/projects/${selectedProject.code}/users/${targetUserId}/agent-tokens`,
      {
        method: 'POST',
        body: JSON.stringify(label ? { label } : {}),
      },
    );

    await refreshAgentTokens();
    return created;
  }, [refreshAgentTokens, selectedProject]);

  const deleteAgentToken = useCallback(async ({ userId, tokenId }) => {
    if (!selectedProject) return false;

    const targetUserId = userId || 'me';
    await fetchJson(
      `http://localhost:3030/projects/${selectedProject.code}/users/${targetUserId}/agent-tokens/${tokenId}`,
      {
        method: 'DELETE',
      },
    );

    await refreshAgentTokens();
    return true;
  }, [refreshAgentTokens, selectedProject]);

  return {
    userGroups,
    loading,
    error,
    refreshAgentTokens,
    createAgentToken,
    deleteAgentToken,
  };
}
