import { Modal, Stack, TextInput, Textarea, Select, Button, Group } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation.js';

export function DeliverableModal({ opened, onClose, onSubmit, deliverable }) {
  const { t, translateDeliverableType } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    type: 'FEATURE',
    description: '',
    specFilepath: '',
    planFilepath: '',
    gitWorktree: '',
    gitBranch: '',
    pullRequestUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (deliverable) {
      setFormData({
        name: deliverable.name || '',
        type: deliverable.type || 'FEATURE',
        description: deliverable.description || '',
        specFilepath: deliverable.specFilepath || '',
        planFilepath: deliverable.planFilepath || '',
        gitWorktree: deliverable.gitWorktree || '',
        gitBranch: deliverable.gitBranch || '',
        pullRequestUrl: deliverable.pullRequestUrl || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'FEATURE',
        description: '',
        specFilepath: '',
        planFilepath: '',
        gitWorktree: '',
        gitBranch: '',
        pullRequestUrl: ''
      });
    }
  }, [deliverable, opened]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      console.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedDeliverable = await onSubmit(formData);
      if (savedDeliverable) {
        onClose();
      } else {
        console.error('Failed to save deliverable');
      }
    } catch (error) {
      console.error('Error submitting deliverable:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={deliverable ? t('deliverables.editDeliverable') : t('deliverables.createDeliverable')}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t('deliverables.name')}
            placeholder={t('deliverables.nameHint')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-autofocus
          />

          <Select
            label={t('deliverables.type')}
            placeholder={t('deliverables.selectType')}
            data={[
              { value: 'FEATURE', label: translateDeliverableType('FEATURE') },
              { value: 'BUG_FIX', label: translateDeliverableType('BUG_FIX') },
              { value: 'REFACTOR', label: translateDeliverableType('REFACTOR') },
              { value: 'ENHANCEMENT', label: translateDeliverableType('ENHANCEMENT') },
              { value: 'CHORE', label: translateDeliverableType('CHORE') },
              { value: 'DOCUMENTATION', label: translateDeliverableType('DOCUMENTATION') }
            ]}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value })}
          />

          <Textarea
            label={t('deliverables.description')}
            placeholder={t('deliverables.descriptionHint')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <TextInput
            label={t('deliverables.specFilepath')}
            placeholder="path/to/SPEC.md"
            value={formData.specFilepath}
            onChange={(e) => setFormData({ ...formData, specFilepath: e.target.value })}
          />

          <TextInput
            label={t('deliverables.planFilepath')}
            placeholder="path/to/PLAN.md"
            value={formData.planFilepath}
            onChange={(e) => setFormData({ ...formData, planFilepath: e.target.value })}
          />

          <TextInput
            label={t('deliverables.gitWorktree')}
            placeholder="feature/my-feature"
            value={formData.gitWorktree}
            onChange={(e) => setFormData({ ...formData, gitWorktree: e.target.value })}
          />

          <TextInput
            label={t('deliverables.gitBranch')}
            placeholder="feature/my-feature"
            value={formData.gitBranch}
            onChange={(e) => setFormData({ ...formData, gitBranch: e.target.value })}
          />

          <TextInput
            label={t('deliverables.pullRequestUrl')}
            placeholder="https://github.com/org/repo/pull/123"
            value={formData.pullRequestUrl}
            onChange={(e) => setFormData({ ...formData, pullRequestUrl: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {deliverable ? t('common.save') : t('deliverables.createDeliverable')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
