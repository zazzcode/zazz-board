import { useState, useEffect, useCallback } from 'react';

export function useDeliverables(selectedProject) {
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch deliverables from API
  useEffect(() => {
    if (!selectedProject) {
      setDeliverables([]);
      return;
    }

    setLoading(true);
    
    const fetchDeliverables = async () => {
      try {
        const token = localStorage.getItem('TB_TOKEN');
        if (!token) {
          console.error('No access token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables`, {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched deliverables:', data);
          setDeliverables(data);
        } else if (response.status === 401) {
          console.error('Unauthorized - access token invalid');
        } else {
          console.error('Failed to fetch deliverables:', response.status);
          setDeliverables([]);
        }
      } catch (error) {
        console.error('Error fetching deliverables:', error);
        setDeliverables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliverables();
  }, [selectedProject]);

  const createDeliverable = useCallback(async (deliverableData) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return null;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables`, {
        method: 'POST',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deliverableData)
      });

      if (response.ok) {
        const deliverable = await response.json();
        setDeliverables(prev => [...prev, deliverable]);
        return deliverable;
      } else {
        console.error('Failed to create deliverable:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error creating deliverable:', error);
      return null;
    }
  }, [selectedProject]);

  const updateDeliverable = useCallback(async (deliverableId, updates) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return null;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverableId}`, {
        method: 'PUT',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedDeliverable = await response.json();
        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId ? updatedDeliverable : d
        ));
        return updatedDeliverable;
      } else {
        console.error('Failed to update deliverable:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating deliverable:', error);
      return null;
    }
  }, [selectedProject]);

  const updateDeliverableStatus = useCallback(async (deliverableId, status) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return null;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverableId}/status`, {
        method: 'PATCH',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedDeliverable = await response.json();
        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId ? updatedDeliverable : d
        ));
        return updatedDeliverable;
      } else {
        console.error('Failed to update deliverable status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating deliverable status:', error);
      return null;
    }
  }, [selectedProject]);

  const approveDeliverable = useCallback(async (deliverableId) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return null;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverableId}/approve`, {
        method: 'PATCH',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedDeliverable = await response.json();
        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId ? updatedDeliverable : d
        ));
        return updatedDeliverable;
      } else {
        console.error('Failed to approve deliverable:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error approving deliverable:', error);
      return null;
    }
  }, [selectedProject]);

  const deleteDeliverable = useCallback(async (deliverableId) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return false;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/deliverables/${deliverableId}`, {
        method: 'DELETE',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
        return true;
      } else {
        console.error('Failed to delete deliverable:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      return false;
    }
  }, [selectedProject]);

  return {
    deliverables,
    loading,
    createDeliverable,
    updateDeliverable,
    updateDeliverableStatus,
    approveDeliverable,
    deleteDeliverable
  };
}
