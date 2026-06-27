import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_VIEW,
  PROJECT_VIEW_ROUTES,
  getDefaultProjectPath,
  getProjectViewPath,
  getProjectViewSegmentData,
} from '../projectRoutes.js';

describe('projectRoutes', () => {
  it('uses Gantt as the default project landing route', () => {
    expect(DEFAULT_PROJECT_VIEW).toBe('gantt');
    expect(getDefaultProjectPath('ZAZZ')).toBe('/projects/ZAZZ/gantt');
  });

  it('places Gantt immediately before Kanban in the project switcher', () => {
    expect(PROJECT_VIEW_ROUTES.map((route) => route.value)).toEqual([
      'gantt',
      'kanban',
      'task-kanban',
      'task-graph',
      'deliverables',
    ]);
    expect(getProjectViewPath('ZAZZ', 'task-graph')).toBe('/projects/ZAZZ/task-graph');
  });

  it('uses the Gantt translation key for switcher labels', () => {
    const labels = getProjectViewSegmentData((key) => ({ 'gantt.title': 'Gantt' })[key] || key);

    expect(labels[0]).toEqual({ value: 'gantt', label: 'Gantt' });
  });
});
