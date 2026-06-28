import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { GanttPage } from '../GanttPage.jsx';

let mockShowDefaultMilestone = true;

vi.mock('../../hooks/useProjectEvents.js', () => ({
  useProjectEvents: vi.fn(),
}));

vi.mock('../../hooks/useProjectGantt.js', () => ({
  useProjectGantt: () => ({
    loading: false,
    error: null,
    refreshGantt: vi.fn(),
    loadDeliverableTasks: vi.fn(),
    ganttData: {
      projectCode: 'ZAZZ',
      range: {
        startDate: '2026-06-01',
        endDate: '2026-07-31',
      },
      timeline: {
        unit: 'sprint',
        sprintStartDate: '2026-06-01',
        sprintLengthWeeks: 2,
        showDefaultMilestone: mockShowDefaultMilestone,
      },
      links: [],
      rows: [
        {
          id: 'milestone:default',
          entityType: 'milestone',
          displayName: 'Default',
          isDefault: true,
        },
        {
          id: 'deliverable:default-eligible',
          entityType: 'deliverable',
          parentId: 'milestone:default',
          deliverableId: 'default-eligible',
          displayName: 'Default eligible deliverable',
          status: 'PLANNING',
        },
        {
          id: 'milestone:one',
          entityType: 'milestone',
          displayName: 'Milestone 1',
          startDate: '2026-06-15',
          endDate: '2026-06-28',
        },
        {
          id: 'deliverable:first',
          entityType: 'deliverable',
          parentId: 'milestone:one',
          deliverableId: 'first',
          displayName: 'First deliverable',
          status: 'IN_PROGRESS',
        },
        {
          id: 'deliverable:second',
          entityType: 'deliverable',
          parentId: 'milestone:one',
          deliverableId: 'second',
          displayName: 'Second deliverable',
          status: 'DONE',
        },
      ],
    },
  }),
}));

vi.mock('../../components/gantt/ProjectGantt.jsx', () => ({
  ProjectGantt: ({ projectGantt, onEditMilestone }) => (
    <>
      <div data-testid="visible-row-ids">
        {projectGantt.rows.map((row) => row.id).join('|')}
      </div>
      <button
        type="button"
        onClick={() => {
          const milestone = projectGantt.rows.find((row) => row.id === 'milestone:one');
          onEditMilestone({ ...milestone, id: ':milestone:one' });
        }}
      >
        Open Milestone 1
      </button>
      <button
        type="button"
        onClick={() => onEditMilestone(projectGantt.rows.find((row) => row.id === 'milestone:default'))}
      >
        Open Default
      </button>
    </>
  ),
}));

function renderGanttPage() {
  return render(
    <MantineProvider>
      <GanttPage selectedProject={{ code: 'ZAZZ', title: 'Zazz Board' }} />
    </MantineProvider>
  );
}

describe('GanttPage milestone editor', () => {
  beforeEach(() => {
    mockShowDefaultMilestone = true;
  });

  it('manages deliverables as an ordered milestone list', async () => {
    const user = userEvent.setup();
    renderGanttPage();

    await user.click(screen.getByRole('button', { name: 'Open Milestone 1' }));

    expect(await screen.findByText('1. First deliverable')).toBeInTheDocument();
    expect(screen.getByText('2. Second deliverable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move First deliverable down' }));

    expect(screen.getByText('1. Second deliverable')).toBeInTheDocument();
    expect(screen.getByText('2. First deliverable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Second deliverable' }));

    expect(screen.queryByText('1. Second deliverable')).not.toBeInTheDocument();
    expect(screen.getByText('1. First deliverable')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Add deliverable'));
    await user.click(await screen.findByText('Default eligible deliverable'));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('2. Default eligible deliverable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Open Default' }));

    expect(await screen.findByText('1. Second deliverable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Second deliverable' })).not.toBeInTheDocument();
  });

  it('hides the default milestone rows when project settings disable them', () => {
    mockShowDefaultMilestone = false;
    renderGanttPage();

    expect(screen.getByTestId('visible-row-ids')).toHaveTextContent('milestone:one');
    expect(screen.getByTestId('visible-row-ids')).not.toHaveTextContent('milestone:default');
    expect(screen.getByTestId('visible-row-ids')).not.toHaveTextContent('deliverable:default-eligible');
  });
});
