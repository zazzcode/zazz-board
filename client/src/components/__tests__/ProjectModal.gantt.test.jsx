import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { ProjectModal } from '../ProjectModal.jsx';

const project = {
  id: 1,
  code: 'ZAZZ',
  title: 'Zazz Board',
  description: 'Primary project',
  leaderId: 5,
  statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'],
};

function mockJson(data, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function renderProjectModal(props = {}) {
  return render(
    <MantineProvider>
      <ProjectModal
        opened
        onClose={vi.fn()}
        onSave={vi.fn()}
        project={project}
        currentUser={{ id: 5, email: 'owner@example.com' }}
        {...props}
      />
    </MantineProvider>
  );
}

describe('ProjectModal Gantt configuration', () => {
  beforeEach(() => {
    localStorage.setItem('TB_TOKEN', 'test-token');
    window.fetch = vi.fn((url) => {
      if (String(url).includes('/status-definitions')) {
        return mockJson([
          { code: 'TO_DO', label: 'To Do' },
          { code: 'IN_PROGRESS', label: 'In Progress' },
          { code: 'DONE', label: 'Done' },
        ]);
      }

      if (String(url).includes('/gantt/settings')) {
        return mockJson({
          projectCode: 'ZAZZ',
          timelineMode: 'weeks',
          showDateLabels: true,
          showDefaultMilestone: true,
          periodStartDate: '2026-06-08',
          sprintLengthWeeks: 3,
          periodNumberStart: 4,
          sprintLabelPrefix: 'Iteration',
          weekLabelPrefix: 'PW',
        });
      }

      return mockJson({});
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loads project Gantt settings into the configuration tab and includes them on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    renderProjectModal({ onSave });

    await user.click(screen.getByRole('tab', { name: /gantt configuration/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Sprint Prefix')).toHaveValue('Iteration');
    });

    expect(screen.getByLabelText('Period Start Date')).toHaveValue('2026-06-08');
    expect(screen.getByLabelText('Week Prefix')).toHaveValue('PW');
    expect(screen.getByRole('switch', { name: 'Show date labels' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Show default milestone' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          ganttSettings: expect.objectContaining({
            timelineMode: 'weeks',
            periodStartDate: '2026-06-08',
            sprintLengthWeeks: 3,
            periodNumberStart: 4,
            showDefaultMilestone: true,
          }),
        })
      );
    });
  });

  it('renders Gantt configuration controls read-only for non-leaders', async () => {
    const user = userEvent.setup();
    renderProjectModal({
      currentUser: { id: 99, email: 'viewer@example.com' },
    });

    await user.click(screen.getByRole('tab', { name: /gantt configuration/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Sprint Prefix')).toHaveValue('Iteration');
    });

    expect(screen.getByLabelText('Period Start Date')).toBeDisabled();
    expect(screen.getByLabelText('Sprint Prefix')).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Show date labels' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Show default milestone' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});
