import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DeliverableListPage } from '../DeliverableListPage.jsx';

const mockCreateDeliverable = vi.fn();
const mockUpdateDeliverable = vi.fn();
const mockDeleteDeliverable = vi.fn();

vi.mock('../../hooks/useDeliverables.js', () => ({
  useDeliverables: () => ({
    deliverables: [
      {
        id: 101,
        deliverableCode: 'ZAZZ-101',
        name: 'Routed deliverable',
        type: 'FEATURE',
        status: 'IN_PROGRESS',
        description: 'Route-owned editor',
        specFilepath: '.zazz/specifications/routed.md',
        planFilepath: '',
        gitWorktree: 'mw-proj-milestones-gantt-db-api',
        gitBranch: 'mw-proj-milestones-gantt-db-api',
        pullRequestUrl: '',
        plannedStartAt: '2026-06-10T00:00:00.000Z',
        plannedCompletionAt: '2026-06-20T00:00:00.000Z',
        actualStartAt: '2026-06-11T00:00:00.000Z',
        actualCompletionAt: null,
      },
    ],
    loading: false,
    createDeliverable: mockCreateDeliverable,
    updateDeliverable: mockUpdateDeliverable,
    deleteDeliverable: mockDeleteDeliverable,
  }),
}));

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}{location.search}</div>;
}

function renderRoute() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[{
        pathname: '/projects/ZAZZ/deliverables/101',
        state: { returnTo: '/projects/ZAZZ/gantt' },
      }]}>
        <CurrentLocation />
        <Routes>
          <Route
            path="/projects/:projectCode/deliverables/:deliverableId"
            element={<DeliverableListPage selectedProject={{ code: 'ZAZZ', title: 'Zazz Board' }} />}
          />
        </Routes>
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('DeliverableListPage routed editor', () => {
  beforeEach(() => {
    mockCreateDeliverable.mockReset();
    mockUpdateDeliverable.mockReset();
    mockDeleteDeliverable.mockReset();
    mockUpdateDeliverable.mockImplementation(async (id, updates) => ({ id, ...updates }));
  });

  it('opens the shared deliverable modal from the canonical route and submits editable planned dates only', async () => {
    const user = userEvent.setup();
    renderRoute();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Planned Start')).toHaveValue('2026-06-10');
    expect(screen.getByLabelText('Actual Start')).toHaveValue('2026-06-11');
    expect(screen.getByLabelText('Actual Start')).toHaveAttribute('readonly');

    const plannedEndInput = screen.getByLabelText('Planned End');
    await user.clear(plannedEndInput);
    await user.type(plannedEndInput, '2026-06-25');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDeliverable).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          name: 'Routed deliverable',
          plannedStartAt: '2026-06-10T00:00:00.000Z',
          plannedCompletionAt: '2026-06-25T00:00:00.000Z',
        })
      );
    });

    expect(mockUpdateDeliverable.mock.calls[0][1]).not.toHaveProperty('actualStartAt');
    expect(mockUpdateDeliverable.mock.calls[0][1]).not.toHaveProperty('actualCompletionAt');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/projects/ZAZZ/gantt');
  });
});
