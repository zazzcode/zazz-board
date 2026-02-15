import { useState } from 'react';

export function usePanelManager() {
  const [openPanels, setOpenPanels] = useState([]);

  const openDetailPanel = (panelId, task, clickPos) => {
    if (!openPanels.find(p => p.id === panelId)) {
      setOpenPanels(prev => [...prev, { id: panelId, task, clickPos }]);
    }
  };

  const closeDetailPanel = (panelId) => {
    setOpenPanels(prev => prev.filter(p => p.id !== panelId));
  };

  const updateTaskPanel = (panelId, updatedTask) => {
    setOpenPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, task: updatedTask } : p
    ));
  };

  return {
    openPanels,
    openDetailPanel,
    closeDetailPanel,
    updateTaskPanel
  };
}
