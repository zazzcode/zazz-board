import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { GanttPage } from '../GanttPage.jsx';

let mockShowDefaultMilestone = true;
const mockRefreshGantt = vi.fn();

function createGanttData(rows) {
  return {
    projectCode: 'ZAZZ',
    version: 'v1',
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
    rows,
  };
}

const initialRows = [
  {
    id: 'milestone:10',
    milestoneId: 10,
    entityType: 'milestone',
    displayName: 'Default',
    isDefault: true,
  },
  {
    id: 'deliverable:100',
    entityType: 'deliverable',
    parentId: 'milestone:10',
    deliverableId: '100',
    displayName: 'Default eligible deliverable',
    status: 'PLANNING',
  },
  {
    id: 'milestone:11',
    milestoneId: 11,
    entityType: 'milestone',
    displayName: 'Milestone 1',
    startDate: '2026-06-15',
    endDate: '2026-06-28',
    status: 'PLANNING',
  },
  {
    id: 'deliverable:101',
    entityType: 'deliverable',
    parentId: 'milestone:11',
    deliverableId: '101',
    displayName: 'First deliverable',
    status: 'IN_PROGRESS',
  },
  {
    id: 'deliverable:102',
    entityType: 'deliverable',
    parentId: 'milestone:11',
    deliverableId: '102',
    displayName: 'Second deliverable',
    status: 'DONE',
  },
];

const savedRows = [
  initialRows[0],
  {
    ...initialRows[4],
    parentId: 'milestone:10',
  },
  initialRows[2],
  initialRows[3],
  {
    ...initialRows[1],
    parentId: 'milestone:11',
  },
];

vi.mock('../../hooks/useProjectEvents.js', () => ({
  useProjectEvents: vi.fn(),
}));

vi.mock('../../hooks/useProjectGantt.js', () => ({
  useProjectGantt: () => ({
    loading: false,
    error: null,
    refreshGantt: mockRefreshGantt,
    loadDeliverableTasks: vi.fn(),
    ganttData: createGanttData(initialRows),
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
          const milestone = projectGantt.rows.find((row) => row.id === 'milestone:11');
          onEditMilestone({ ...milestone, id: ':milestone:11' });
        }}
      >
        Open Milestone 1
      </button>
      <button
        type="button"
        onClick={() => onEditMilestone(projectGantt.rows.find((row) => row.isDefault))}
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
    mockRefreshGantt.mockReset();
    mockRefreshGantt.mockResolvedValue(createGanttData(initialRows));
    localStorage.setItem('TB_TOKEN', 'test-token');
    window.fetch = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/milestones/11') && options.method === 'PUT') {
        return Response.json({ id: 11, startDate: '2026-06-15', endDate: '2026-06-28' });
      }
      if (String(url).endsWith('/milestones/11/deliverables') && options.method === 'PUT') {
        return Response.json(createGanttData(savedRows));
      }
      if (String(url).endsWith('/milestones') && options.method === 'POST') {
        return Response.json({ id: 12, startDate: '2026-08-01', endDate: '2026-08-15' }, { status: 201 });
      }
      return Response.json({});
    });
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

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:3030/projects/ZAZZ/milestones/11',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            startDate: '2026-06-15',
            endDate: '2026-06-28',
            status: 'PLANNING',
          }),
        })
      );
      expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:3030/projects/ZAZZ/milestones/11/deliverables',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            deliverableIds: [101, 100],
            expectedVersion: 'v1',
          }),
        })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Open Default' }));

    expect(await screen.findByText('1. Second deliverable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Second deliverable' })).not.toBeInTheDocument();
  });

  it('creates a planned milestone through the Gantt API', async () => {
    const user = userEvent.setup();
    renderGanttPage();

    await user.click(screen.getByRole('button', { name: 'Create Milestone' }));
    await user.type(await screen.findByLabelText('Start Date'), '2026-08-01');
    await user.type(await screen.findByLabelText('End Date'), '2026-08-15');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:3030/projects/ZAZZ/milestones',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            startDate: '2026-08-01',
            endDate: '2026-08-15',
            status: 'PLANNING',
          }),
        })
      );
      expect(mockRefreshGantt).toHaveBeenCalled();
    });
  });

  it('hides the default milestone rows when project settings disable them', () => {
    mockShowDefaultMilestone = false;
    renderGanttPage();

    expect(screen.getByTestId('visible-row-ids')).toHaveTextContent('milestone:11');
    expect(screen.getByTestId('visible-row-ids')).not.toHaveTextContent('milestone:10');
    expect(screen.getByTestId('visible-row-ids')).not.toHaveTextContent('deliverable:100');
  });
});
