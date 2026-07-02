import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { ProjectGantt } from '../ProjectGantt.jsx';

vi.mock('@svar-ui/react-gantt', () => ({
  Gantt: ({ tasks, columns, taskTemplate: TaskTemplate }) => (
    <div>
      <div data-testid="mock-grid">
        {tasks.map((task) => (
          <div key={`grid-${task.id}`}>
            {columns.map((column) => (
              <div key={column.id}>
                {column.cell ? column.cell({ row: task }) : task[column.id]}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div data-testid="mock-chart">
        {tasks.map((task) => (
          <TaskTemplate key={`bar-${task.id}`} data={task} />
        ))}
      </div>
    </div>
  ),
  Willow: ({ children }) => <>{children}</>,
  WillowDark: ({ children }) => <>{children}</>,
}));

const translations = {
  'gantt.columns.item': 'Item',
  'gantt.columns.status': 'Status',
  'gantt.columns.progress': 'Progress',
  'gantt.editMilestone': 'Edit Milestone',
  'gantt.editDeliverable': 'Edit Deliverable',
};

function t(key) {
  return translations[key] || key;
}

function renderProjectGantt(props = {}) {
  const projectGantt = {
    projectCode: 'ZAZZ',
    range: {
      startDate: '2026-06-01',
      endDate: '2026-08-15',
    },
    timeline: {},
    links: [],
    rows: [
      {
        id: 'milestone:11',
        milestoneId: 11,
        entityType: 'milestone',
        displayName: 'Milestone 1',
        startDate: '2026-06-15',
        endDate: '2026-08-15',
      },
      {
        id: 'deliverable:101',
        deliverableId: 101,
        entityType: 'deliverable',
        parentId: 'milestone:11',
        displayName: 'First deliverable',
        startDate: '2026-06-15',
        endDate: '2026-07-04',
      },
    ],
  };

  return render(
    <MantineProvider>
      <ProjectGantt
        projectGantt={projectGantt}
        loadDeliverableTasks={vi.fn()}
        t={t}
        {...props}
      />
    </MantineProvider>
  );
}

describe('ProjectGantt interactions', () => {
  it('opens milestone and deliverable editors from grid title double-clicks', async () => {
    const user = userEvent.setup();
    const onEditMilestone = vi.fn();
    const onEditDeliverable = vi.fn();
    renderProjectGantt({ onEditMilestone, onEditDeliverable });

    await user.dblClick(screen.getByRole('button', { name: 'Edit Milestone: Milestone 1' }));
    await user.dblClick(screen.getByRole('button', { name: 'Edit Deliverable: First deliverable' }));

    expect(onEditMilestone).toHaveBeenCalledWith(expect.objectContaining({
      id: 'milestone:11',
      displayName: 'Milestone 1',
    }));
    expect(onEditDeliverable).toHaveBeenCalledWith(expect.objectContaining({
      id: 'deliverable:101',
      displayName: 'First deliverable',
    }));
  });

  it('opens milestone and deliverable editors from bar double-clicks', async () => {
    const user = userEvent.setup();
    const onEditMilestone = vi.fn();
    const onEditDeliverable = vi.fn();
    renderProjectGantt({ onEditMilestone, onEditDeliverable });

    await user.dblClick(screen.getByTitle('Milestone 1'));
    await user.dblClick(screen.getByTitle('First deliverable'));

    expect(onEditMilestone).toHaveBeenCalledWith(expect.objectContaining({
      id: 'milestone:11',
      displayName: 'Milestone 1',
    }));
    expect(onEditDeliverable).toHaveBeenCalledWith(expect.objectContaining({
      id: 'deliverable:101',
      displayName: 'First deliverable',
    }));
  });
});
