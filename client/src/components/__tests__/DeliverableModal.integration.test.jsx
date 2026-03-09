import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { DeliverableModal } from '../DeliverableModal.jsx';

function DeliverableEditHarness() {
  const [opened, setOpened] = useState(true);
  const [deliverable, setDeliverable] = useState({
    id: 1,
    name: 'Deliverable One',
    type: 'FEATURE',
    description: '',
    gitBranch: 'original-branch',
    gitWorktree: 'worktree-one',
  });

  const handleSubmit = async (formData) => {
    const updated = { ...deliverable, ...formData };
    setDeliverable(updated);
    return updated;
  };

  return (
    <>
      <button type="button" onClick={() => setOpened(true)}>Open Deliverable Editor</button>
      <div data-testid="saved-git-branch">{deliverable.gitBranch}</div>
      {opened && (
        <DeliverableModal
          opened={opened}
          onClose={() => setOpened(false)}
          onSubmit={handleSubmit}
          deliverable={deliverable}
        />
      )}
    </>
  );
}

describe('Deliverable edit flow', () => {
  it('saves changes and shows updated value when reopened without page reload', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <DeliverableEditHarness />
      </MantineProvider>
    );

    const gitBranchInput = screen.getByLabelText('Git Branch');
    await user.clear(gitBranchInput);
    await user.type(gitBranchInput, 'ZZZ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Git Branch')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('saved-git-branch')).toHaveTextContent('ZZZ');

    await user.click(screen.getByRole('button', { name: 'Open Deliverable Editor' }));
    const reopenedGitBranchInput = await screen.findByLabelText('Git Branch');
    expect(reopenedGitBranchInput).toHaveValue('ZZZ');
  });
});
