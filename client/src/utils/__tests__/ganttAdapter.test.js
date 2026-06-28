import { describe, expect, it } from 'vitest';
import { toSvarGantt, toSvarGanttExpansion } from '../ganttAdapter.js';

const translations = {
  'gantt.defaultMilestone': 'Default',
  'gantt.numberedMilestone': 'Milestone {{number}}',
};

function t(key, params = {}) {
  return (translations[key] || key).replace('{{number}}', String(params.number));
}

const projectGantt = {
  projectCode: 'ZAZZ',
  range: {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  },
  timeline: {
    unit: 'sprint',
    sprintStartDate: '2026-06-01',
    sprintLengthWeeks: 2,
    sprintLabelPrefix: 'Sprint',
    weekLabelPrefix: 'W',
  },
  rows: [
    {
      id: 'milestone:default',
      entityType: 'milestone',
      labelKey: 'gantt.defaultMilestone',
      startDate: '2026-06-01',
      endDate: '2026-06-14',
      status: 'IN_PROGRESS',
      progress: 40,
      completed: false,
      isDefault: true,
    },
    {
      id: 'milestone:one',
      entityType: 'milestone',
      labelKey: 'gantt.numberedMilestone',
      labelParams: { number: 1 },
      startDate: '2026-06-15',
      endDate: '2026-06-30',
      status: 'DONE',
      progress: 100,
      completed: true,
    },
    {
      id: 'deliverable:m1-d1',
      entityType: 'deliverable',
      parentId: 'milestone:one',
      displayName: 'SVAR Gantt UI and mocked contract',
      startDate: '2026-06-15',
      endDate: '2026-06-24',
      status: 'DONE',
      progress: 100,
      completed: true,
      lazyTasks: true,
    },
  ],
  links: [
    {
      id: 'link:m1-d1',
      sourceId: 'deliverable:m1-d1',
      targetId: 'milestone:one',
      type: 'e2s',
    },
  ],
};

describe('ganttAdapter', () => {
  it('maps project milestones and deliverables to SVAR task rows and dependency links', () => {
    const result = toSvarGantt(projectGantt, t);

    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'milestone:default',
          text: 'Default',
          type: 'summary',
          parent: 0,
          open: true,
        }),
        expect.objectContaining({
          id: 'milestone:one',
          text: 'Milestone 1',
          type: 'summary',
          zazzCompleted: true,
        }),
        expect.objectContaining({
          id: 'deliverable:m1-d1',
          parent: 'milestone:one',
          lazy: true,
          zazzCssClass: 'zazz-gantt-complete',
        }),
      ])
    );
    expect(result.links).toContainEqual(
      expect.objectContaining({
        id: 'link:m1-d1',
        source: 'deliverable:m1-d1',
        target: 'milestone:one',
        type: 'e2s',
      })
    );
    expect(result.projectStart).toBeInstanceOf(Date);
    expect(result.projectEnd).toBeInstanceOf(Date);
  });

  it('builds sprint and project-week scale labels from real dates', () => {
    const result = toSvarGantt(projectGantt, t);
    const sprintScale = result.scales[1];
    const weekScale = result.scales[2];

    expect(sprintScale.unit).toBe('week');
    expect(sprintScale.step).toBe(2);
    expect(sprintScale.format(new Date('2026-06-01T00:00:00'))).toBe('Sprint 1');
    expect(sprintScale.format(new Date('2026-06-15T00:00:00'))).toBe('Sprint 2');
    expect(weekScale.format(new Date('2026-06-22T00:00:00'))).toBe('W4');
  });

  it('keeps generated milestone labels localized by the supplied translator', () => {
    const german = (key, params = {}) => {
      if (key === 'gantt.defaultMilestone') return 'Standard';
      if (key === 'gantt.numberedMilestone') return `Meilenstein ${params.number}`;
      return key;
    };
    const spanish = (key, params = {}) => {
      if (key === 'gantt.defaultMilestone') return 'Predeterminado';
      if (key === 'gantt.numberedMilestone') return `Hito ${params.number}`;
      return key;
    };

    expect(toSvarGantt(projectGantt, german).tasks[1].text).toBe('Meilenstein 1');
    expect(toSvarGantt(projectGantt, spanish).tasks[1].text).toBe('Hito 1');
  });

  it('maps lazy loaded task rows under the expanded deliverable', () => {
    const expansion = toSvarGanttExpansion({
      rows: [
        {
          id: 'task:gantt-contract',
          entityType: 'task',
          parentId: 'deliverable:m1-d1',
          displayName: 'Define mocked Gantt JSON contract',
          startDate: '2026-06-15',
          endDate: '2026-06-17',
          status: 'COMPLETED',
          progress: 100,
          completed: true,
        },
      ],
      links: [],
    }, t);

    expect(expansion.tasks).toContainEqual(
      expect.objectContaining({
        id: 'task:gantt-contract',
        parent: 'deliverable:m1-d1',
        type: 'task',
        zazzCssClass: 'zazz-gantt-complete',
      })
    );
  });
});
