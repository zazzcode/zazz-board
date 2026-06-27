import { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconChartBar, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import { StatusWorkflowEditor } from './StatusWorkflowEditor.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useStatusDefinitions } from '../hooks/useStatusDefinitions.js';

const defaultGanttSettings = {
  timelineMode: 'sprint',
  showDateLabels: false,
  showDefaultMilestone: false,
  periodStartDate: '2026-06-01',
  sprintLengthWeeks: 2,
  periodNumberStart: 1,
  sprintLabelPrefix: 'Sprint',
  weekLabelPrefix: 'W',
};

function createDefaultGanttSettings() {
  return { ...defaultGanttSettings };
}

export function ProjectModal({ 
  opened, 
  onClose, 
  onSave, 
  project = null,  // null for create mode, project object for edit mode
  users = [],  // Available users for leader selection
  currentUser = null
}) {
  const { t } = useTranslation();
  const { statusDefinitions, loading: loadingStatuses } = useStatusDefinitions();
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [loadingGanttSettings, setLoadingGanttSettings] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    leaderId: null,
    statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'],  // Default workflow
    ganttSettings: createDefaultGanttSettings(),
  });

  const [statusesWithTasks, setStatusesWithTasks] = useState([]);

  // Initialize form when modal opens or project changes
  useEffect(() => {
    if (opened) {
      if (project) {
        // Edit mode - populate with existing project data
        setFormData({
          code: project.code || '',
          title: project.title || '',
          description: project.description || '',
          leaderId: project.leaderId || null,
          statusWorkflow: project.statusWorkflow || ['TO_DO', 'IN_PROGRESS', 'DONE'],
          ganttSettings: {
            ...createDefaultGanttSettings(),
            ...(project.ganttSettings || {}),
          },
        });
        // TODO: Fetch which statuses have tasks for this project
        // For now, assume no restrictions in edit mode
        setStatusesWithTasks([]);

        const token = localStorage.getItem('TB_TOKEN');
        if (token && project.code) {
          let cancelled = false;
          setLoadingGanttSettings(true);

          fetch(`http://localhost:3030/projects/${project.code}/gantt/settings`, {
            method: 'GET',
            headers: {
              'TB_TOKEN': token,
              'Content-Type': 'application/json',
            },
          })
            .then(async (response) => {
              if (!response.ok) return null;
              return response.json();
            })
            .then((settings) => {
              if (cancelled || !settings) return;
              setFormData(prev => ({
                ...prev,
                ganttSettings: {
                  ...createDefaultGanttSettings(),
                  ...settings,
                },
              }));
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setLoadingGanttSettings(false);
            });

          return () => {
            cancelled = true;
          };
        }

        setLoadingGanttSettings(false);
      } else {
        // Create mode - reset to defaults
        setFormData({
          code: '',
          title: '',
          description: '',
          leaderId: null,
          statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'],
          ganttSettings: createDefaultGanttSettings(),
        });
        setLoadingGanttSettings(false);
        setStatusesWithTasks([]);
      }
      setActiveTab('details');
      setError(null);
    }
  }, [opened, project]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.code || !formData.title) {
      setError('Project code and title are required');
      return;
    }

    if (formData.statusWorkflow.length === 0) {
      setError('At least one status must be selected');
      setActiveTab('workflow');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowChange = (newWorkflow) => {
    setFormData(prev => ({ ...prev, statusWorkflow: newWorkflow }));
  };

  const handleGanttSettingsChange = (patch) => {
    setFormData(prev => ({
      ...prev,
      ganttSettings: {
        ...prev.ganttSettings,
        ...patch,
      },
    }));
  };

  const isEditMode = !!project;
  // If creating new project, current user will be leader (or can select). If editing, check if they match leaderId.
  // Note: currentUser might be null if not loaded yet, default to false safe.
  const isLeader = !isEditMode || (currentUser && project?.leaderId === currentUser.id);
  
  const title = isEditMode 
    ? (isLeader ? t('projects.editProject') : `${t('projects.projectDetails')} (Read Only)`)
    : t('projects.createProject');

  // Get available status codes
  const availableStatusCodes = statusDefinitions.map(def => def.code);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="lg"
      closeOnClickOutside={false}
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
            {t('projects.projectDetails')}
          </Tabs.Tab>
          <Tabs.Tab value="workflow" leftSection={<IconSettings size={16} />}>
            Status Workflow
          </Tabs.Tab>
          <Tabs.Tab value="gantt" leftSection={<IconChartBar size={16} />}>
            {t('gantt.configuration')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="details" pt="md">
          <Stack gap="md">
            {isEditMode && !isLeader && (
              <Alert color="blue">
                <span style={{ color: '#228be6', fontWeight: 600 }}>Read Only:</span> Only the project leader can edit these details.
              </Alert>
            )}
            
            <TextInput
              label={t('projects.projectCode')}
              placeholder="WEBRED"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              required
              disabled={isEditMode}  // Can't change code in edit mode
              description={isEditMode ? "Project code cannot be changed" : "Short uppercase code (e.g., WEBRED, MOBDEV)"}
            />

            <TextInput
              label={t('projects.projectName')}
              placeholder="Website Redesign"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              disabled={!isLeader}
            />

            <Textarea
              label={t('projects.description')}
              placeholder="Project description..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              disabled={!isLeader}
            />

            {!isEditMode && users.length > 0 && (
              <Select
                label={t('projects.leader')}
                placeholder="Select project leader"
                value={formData.leaderId ? String(formData.leaderId) : null}
                onChange={(value) => setFormData(prev => ({ ...prev, leaderId: value ? Number(value) : null }))}
                data={users.map(user => ({
                  value: String(user.id),
                  label: `${user.fullName} (${user.email})`
                }))}
                searchable
              />
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="workflow" pt="md">
          <Stack gap="md">
            {isEditMode && !isLeader && (
              <Alert color="blue">
                <span style={{ color: '#228be6', fontWeight: 600 }}>Read Only:</span> Only the project leader can edit the status workflow.
              </Alert>
            )}
            
            {loadingStatuses ? (
              <div>Loading statuses...</div>
            ) : (
              <StatusWorkflowEditor
                availableStatuses={availableStatusCodes}
                selectedStatuses={formData.statusWorkflow}
                onChange={handleWorkflowChange}
                statusesWithTasks={statusesWithTasks}
                readOnly={!isLeader}
              />
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="gantt" pt="md">
          <Stack gap="md">
            {isEditMode && !isLeader && (
              <Alert color="blue">
                <span style={{ color: '#228be6', fontWeight: 600 }}>Read Only:</span> Only the project leader can edit Gantt configuration.
              </Alert>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label={t('gantt.fields.timelineMode')}
                data={[
                  { value: 'dates', label: t('gantt.timelineModes.dates') },
                  { value: 'weeks', label: t('gantt.timelineModes.weeks') },
                  { value: 'sprint', label: t('gantt.timelineModes.sprints') },
                ]}
                value={formData.ganttSettings.timelineMode}
                onChange={(value) => handleGanttSettingsChange({ timelineMode: value })}
                disabled={!isLeader || loadingGanttSettings}
              />

              <TextInput
                type="date"
                label={t('gantt.fields.periodStartDate')}
                value={formData.ganttSettings.periodStartDate}
                onChange={(e) => handleGanttSettingsChange({ periodStartDate: e.target.value })}
                disabled={!isLeader || loadingGanttSettings}
              />

              <NumberInput
                label={t('gantt.fields.sprintLengthWeeks')}
                value={formData.ganttSettings.sprintLengthWeeks}
                onChange={(value) => handleGanttSettingsChange({ sprintLengthWeeks: value || 1 })}
                min={1}
                max={12}
                disabled={!isLeader || loadingGanttSettings}
              />

              <NumberInput
                label={t('gantt.fields.startingNumber')}
                value={formData.ganttSettings.periodNumberStart}
                onChange={(value) => handleGanttSettingsChange({ periodNumberStart: value || 0 })}
                min={0}
                disabled={!isLeader || loadingGanttSettings}
              />

              <TextInput
                label={t('gantt.fields.sprintPrefix')}
                value={formData.ganttSettings.sprintLabelPrefix}
                onChange={(e) => handleGanttSettingsChange({ sprintLabelPrefix: e.target.value })}
                disabled={!isLeader || loadingGanttSettings}
              />

              <TextInput
                label={t('gantt.fields.weekPrefix')}
                value={formData.ganttSettings.weekLabelPrefix}
                onChange={(e) => handleGanttSettingsChange({ weekLabelPrefix: e.target.value })}
                disabled={!isLeader || loadingGanttSettings}
              />
            </SimpleGrid>

            <Switch
              label={t('gantt.fields.showDateLabels')}
              checked={formData.ganttSettings.showDateLabels}
              onChange={(e) => handleGanttSettingsChange({ showDateLabels: e.currentTarget.checked })}
              disabled={!isLeader || loadingGanttSettings}
            />
            <Switch
              label={t('gantt.fields.showDefaultMilestone')}
              checked={formData.ganttSettings.showDefaultMilestone}
              onChange={(e) => handleGanttSettingsChange({ showDefaultMilestone: e.currentTarget.checked })}
              disabled={!isLeader || loadingGanttSettings}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {error && (
        <Alert color="red" mt="md" title="Error">
          {error}
        </Alert>
      )}

      <Group justify="flex-end" mt="xl">
        <Button variant="subtle" onClick={onClose} disabled={saving}>
          {isLeader ? t('common.cancel') : t('common.close')}
        </Button>
        {isLeader && (
          <Button onClick={handleSubmit} loading={saving}>
            {isEditMode ? t('common.save') : t('projects.createProject')}
          </Button>
        )}
      </Group>
    </Modal>
  );
}
