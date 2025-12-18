import { useState } from 'react';

export function useModalManager() {
  const [openModals, setOpenModals] = useState([]);

  const openModal = (modalId, task) => {
    if (!openModals.find(m => m.id === modalId)) {
      setOpenModals(prev => [...prev, { id: modalId, task }]);
    }
  };

  const closeModal = (modalId) => {
    setOpenModals(prev => prev.filter(m => m.id !== modalId));
  };

  const updateModalTask = (modalId, updatedTask) => {
    setOpenModals(prev => prev.map(m => 
      m.id === modalId ? { ...m, task: updatedTask } : m
    ));
  };

  return {
    openModals,
    openModal,
    closeModal,
    updateModalTask
  };
}
