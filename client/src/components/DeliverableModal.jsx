import { Modal, Stack, TextInput, Textarea, Select, Button, Group, Grid, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation.js';

const emptyFormData = {
  name: '',
  type: 'FEATURE',
  description: '',
  specFilepath: '',
  planFilepath: '',
  gitWorktree: '',
  gitBranch: '',
  pullRequestUrl: '',
  plannedStartAt: '',
  plannedCompletionAt: '',
  actualStartAt: '',
  actualCompletionAt: ''
};

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toDateTimePayload(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function DeliverableModal({ opened, onClose, onSubmit, deliverable }) {
  const { t, translateDeliverableType } = useTranslation();

  const [formData, setFormData] = useState(emptyFormData);

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
        pullRequestUrl: deliverable.pullRequestUrl || '',
        plannedStartAt: toDateInputValue(deliverable.plannedStartAt),
        plannedCompletionAt: toDateInputValue(deliverable.plannedCompletionAt),
        actualStartAt: toDateInputValue(deliverable.actualStartAt),
        actualCompletionAt: toDateInputValue(deliverable.actualCompletionAt)
      });
    } else {
      setFormData(emptyFormData);
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
      const { actualStartAt: _actualStartAt, actualCompletionAt: _actualCompletionAt, ...editableFormData } = formData;
      const savedDeliverable = await onSubmit({
        ...editableFormData,
        plannedStartAt: toDateTimePayload(editableFormData.plannedStartAt),
        plannedCompletionAt: toDateTimePayload(editableFormData.plannedCompletionAt)
      });
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

          <Divider label={t('deliverables.schedule')} labelPosition="left" />

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateInput
                label={t('deliverables.plannedStartAt')}
                placeholder="YYYY-MM-DD"
                value={formData.plannedStartAt}
                onChange={(value) => setFormData({ ...formData, plannedStartAt: toDateInputValue(value) })}
                valueFormat="YYYY-MM-DD"
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateInput
                label={t('deliverables.plannedCompletionAt')}
                placeholder="YYYY-MM-DD"
                value={formData.plannedCompletionAt}
                onChange={(value) => setFormData({ ...formData, plannedCompletionAt: toDateInputValue(value) })}
                valueFormat="YYYY-MM-DD"
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateInput
                label={t('deliverables.actualStartAt')}
                placeholder="YYYY-MM-DD"
                value={formData.actualStartAt}
                valueFormat="YYYY-MM-DD"
                readOnly
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateInput
                label={t('deliverables.actualCompletionAt')}
                placeholder="YYYY-MM-DD"
                value={formData.actualCompletionAt}
                valueFormat="YYYY-MM-DD"
                readOnly
              />
            </Grid.Col>
          </Grid>

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
