export const PROJECT_VIEW_ROUTES = [
  { value: 'gantt', path: '/gantt', labelKey: 'gantt.title', fallbackLabel: 'Gantt' },
  { value: 'kanban', path: '/kanban', fallbackLabel: 'Kanban' },
  { value: 'task-kanban', path: '/task-kanban', fallbackLabel: 'Task Kanban' },
  { value: 'task-graph', path: '/task-graph', fallbackLabel: 'Graph' },
  { value: 'deliverables', path: '/deliverables', fallbackLabel: 'Deliverables' },
];

export const DEFAULT_PROJECT_VIEW = 'gantt';

export function getDefaultProjectPath(projectCode) {
  return `/projects/${projectCode}${PROJECT_VIEW_ROUTES.find((route) => route.value === DEFAULT_PROJECT_VIEW).path}`;
}

export function getProjectViewPath(projectCode, view) {
  const route = PROJECT_VIEW_ROUTES.find((item) => item.value === view);
  return route ? `/projects/${projectCode}${route.path}` : null;
}

export function getProjectViewSegmentData(t) {
  return PROJECT_VIEW_ROUTES.map((route) => ({
    value: route.value,
    label: route.labelKey && t ? t(route.labelKey) : route.fallbackLabel,
  }));
}
