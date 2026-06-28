import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useProjectEvents } from '../hooks/useProjectEvents.js';
import { useProjectGantt } from '../hooks/useProjectGantt.js';
import { ProjectGantt } from '../components/gantt/ProjectGantt.jsx';

const REFRESH_EVENT_TYPES = new Set(['deliverable', 'task', 'relation', 'milestone', 'gantt']);
const EMPTY_MILESTONE_FORM = {
  name: '',
  startDate: '',
  endDate: '',
  deliverableIds: [],
};

function getTokenHeaders() {
  const token = localStorage.getItem('TB_TOKEN');
  if (!token) throw new Error('No access token found');

  return {
    'TB_TOKEN': token,
    'Content-Type': 'application/json',
  };
}

function getDeliverableFormId(row) {
  return String(row.deliverableId || row.id);
}

function getDeliverableFormLabel(row) {
  return row.displayName || row.deliverableCode || row.id;
}

function normalizeGanttEntityId(id) {
  return String(id || '').replace(/^:/, '');
}

function getMilestoneApiId(row) {
  return String(row?.milestoneId || normalizeGanttEntityId(row?.id).replace(/^milestone:/, ''));
}

function getDefaultMilestoneId(rows) {
  return normalizeGanttEntityId(rows.find((row) => row.entityType === 'milestone' && row.isDefault)?.id);
}

function getVisibleGanttData(ganttData, rows) {
  if (!ganttData) return null;
  if (ganttData.timeline?.showDefaultMilestone) return { ...ganttData, rows };

  const defaultMilestoneId = getDefaultMilestoneId(rows);
  if (!defaultMilestoneId) return { ...ganttData, rows };

  const hiddenIds = new Set(
    rows
      .filter((row) => (
        normalizeGanttEntityId(row.id) === defaultMilestoneId
        || normalizeGanttEntityId(row.parentId) === defaultMilestoneId
      ))
      .map((row) => normalizeGanttEntityId(row.id))
  );

  return {
    ...ganttData,
    rows: rows.filter((row) => !hiddenIds.has(normalizeGanttEntityId(row.id))),
    links: (ganttData.links || []).filter((link) => (
      !hiddenIds.has(normalizeGanttEntityId(link.sourceId))
      && !hiddenIds.has(normalizeGanttEntityId(link.targetId))
    )),
  };
}

export function GanttPage({ selectedProject }) {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDarkTheme = colorScheme === 'dark';
  const toolbarBorderColor = isDarkTheme ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)';
  const toolbarBackground = isDarkTheme ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-0)';
  const projectCode = selectedProject?.code;
  const { ganttData, loading, error, refreshGantt, loadDeliverableTasks } = useProjectGantt(projectCode);
  const refreshTimerRef = useRef(null);
  const loadedDraftProjectRef = useRef(null);
  const [milestoneModalOpened, setMilestoneModalOpened] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE_FORM);
  const [milestoneSaving, setMilestoneSaving] = useState(false);
  const [milestoneMutationError, setMilestoneMutationError] = useState(null);
  const [deliverableToAddId, setDeliverableToAddId] = useState(null);
  const [draftRows, setDraftRows] = useState([]);
  const workingRows = useMemo(() => (
    draftRows.length > 0 ? draftRows : (ganttData?.rows || [])
  ), [draftRows, ganttData?.rows]);
  const workingGanttData = useMemo(
    () => getVisibleGanttData(ganttData, workingRows),
    [ganttData, workingRows]
  );

  const allDeliverables = useMemo(() => workingRows
    .filter((row) => row.entityType === 'deliverable')
    .map((row) => ({
      id: getDeliverableFormId(row),
      label: getDeliverableFormLabel(row),
      status: row.status,
      parentId: normalizeGanttEntityId(row.parentId),
    })), [workingRows]);

  const defaultMilestoneId = useMemo(() => (
    getDefaultMilestoneId(workingRows)
  ), [workingRows]);

  const editingMilestoneId = normalizeGanttEntityId(editingMilestone?.id);
  const editingMilestoneApiId = getMilestoneApiId(editingMilestone);
  const editingDefaultMilestone = Boolean(editingMilestoneId && editingMilestoneId === defaultMilestoneId);

  const selectedDeliverables = useMemo(() => milestoneForm.deliverableIds.map((deliverableId) => {
    const deliverable = allDeliverables.find((item) => item.id === deliverableId);
    return deliverable || { id: deliverableId, label: deliverableId };
  }), [allDeliverables, milestoneForm.deliverableIds]);

  const availableDeliverableOptions = useMemo(() => {
    const selectedIds = new Set(milestoneForm.deliverableIds);
    return allDeliverables
      .filter((deliverable) => !selectedIds.has(deliverable.id))
      .filter((deliverable) => (
        !deliverable.parentId
        || deliverable.parentId === defaultMilestoneId
        || deliverable.parentId === editingMilestoneId
      ))
      .map((deliverable) => ({
        value: deliverable.id,
        label: deliverable.label,
      }));
  }, [allDeliverables, defaultMilestoneId, editingMilestoneId, milestoneForm.deliverableIds]);

  const getMilestoneName = useCallback((milestone) => {
    if (!milestone) return '';
    if (milestone.displayName) return milestone.displayName;
    if (milestone.labelKey) return t(milestone.labelKey, milestone.labelParams || {});
    return milestone.id || '';
  }, [t]);

  const openCreateMilestone = useCallback(() => {
    setEditingMilestone(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
    setMilestoneMutationError(null);
    setDeliverableToAddId(null);
    setMilestoneModalOpened(true);
  }, []);

  const openEditMilestone = useCallback((milestone) => {
    const milestoneId = normalizeGanttEntityId(milestone.id);
    const deliverableIds = workingRows
      .filter((row) => row.entityType === 'deliverable' && normalizeGanttEntityId(row.parentId) === milestoneId)
      .map((row) => String(row.deliverableId || row.id));

    setEditingMilestone({ ...milestone, id: milestoneId });
    setMilestoneForm({
      name: getMilestoneName(milestone),
      startDate: milestone.startDate || '',
      endDate: milestone.endDate || '',
      deliverableIds,
    });
    setDeliverableToAddId(null);
    setMilestoneMutationError(null);
    setMilestoneModalOpened(true);
  }, [getMilestoneName, workingRows]);

  const closeMilestoneModal = useCallback(() => {
    setMilestoneModalOpened(false);
    setEditingMilestone(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
    setMilestoneMutationError(null);
    setDeliverableToAddId(null);
  }, []);

  const addDeliverableToMilestone = useCallback(() => {
    if (!deliverableToAddId) return;

    setMilestoneForm((prev) => {
      if (prev.deliverableIds.includes(deliverableToAddId)) return prev;
      return {
        ...prev,
        deliverableIds: [...prev.deliverableIds, deliverableToAddId],
      };
    });
    setDeliverableToAddId(null);
  }, [deliverableToAddId]);

  const removeDeliverableFromMilestone = useCallback((deliverableId) => {
    setMilestoneForm((prev) => ({
      ...prev,
      deliverableIds: prev.deliverableIds.filter((id) => id !== deliverableId),
    }));
  }, []);

  const moveDeliverableInMilestone = useCallback((deliverableId, direction) => {
    setMilestoneForm((prev) => {
      const deliverableIds = [...prev.deliverableIds];
      const index = deliverableIds.indexOf(deliverableId);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= deliverableIds.length) return prev;

      [deliverableIds[index], deliverableIds[nextIndex]] = [deliverableIds[nextIndex], deliverableIds[index]];
      return { ...prev, deliverableIds };
    });
  }, []);

  const requestJson = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getTokenHeaders(),
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Gantt request failed: ${response.status}`);
    }
    return payload;
  }, []);

  const replaceMilestoneDeliverables = useCallback(async (milestoneId, deliverableIds) => {
    return requestJson(`http://localhost:3030/projects/${encodeURIComponent(projectCode)}/milestones/${encodeURIComponent(milestoneId)}/deliverables`, {
      method: 'PUT',
      body: JSON.stringify({
        deliverableIds: deliverableIds.map((id) => Number(id)),
        expectedVersion: ganttData?.version,
      }),
    });
  }, [ganttData?.version, projectCode, requestJson]);

  const applySavedProjection = useCallback(async (projection) => {
    const latestProjection = projection || await refreshGantt();
    if (latestProjection?.rows) {
      loadedDraftProjectRef.current = latestProjection.projectCode;
      setDraftRows(latestProjection.rows);
    }
  }, [refreshGantt]);

  const saveMilestoneForm = useCallback(async () => {
    if (!projectCode || milestoneSaving) return;

    setMilestoneSaving(true);
    setMilestoneMutationError(null);

    try {
      const body = {
        startDate: milestoneForm.startDate,
        endDate: milestoneForm.endDate,
        status: editingMilestone?.status || 'PLANNING',
      };

      if (!editingMilestone) {
        const milestone = await requestJson(`http://localhost:3030/projects/${encodeURIComponent(projectCode)}/milestones`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const projection = milestoneForm.deliverableIds.length > 0
          ? await replaceMilestoneDeliverables(milestone.id, milestoneForm.deliverableIds)
          : await refreshGantt();
        await applySavedProjection(projection);
        closeMilestoneModal();
        return;
      }

      await requestJson(`http://localhost:3030/projects/${encodeURIComponent(projectCode)}/milestones/${encodeURIComponent(editingMilestoneApiId)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      const projection = editingDefaultMilestone
        ? await refreshGantt()
        : await replaceMilestoneDeliverables(editingMilestoneApiId, milestoneForm.deliverableIds);
      await applySavedProjection(projection);
      closeMilestoneModal();
    } catch (error) {
      setMilestoneMutationError(error.message);
    } finally {
      setMilestoneSaving(false);
    }
  }, [
    applySavedProjection,
    closeMilestoneModal,
    editingDefaultMilestone,
    editingMilestone,
    editingMilestoneApiId,
    milestoneForm.deliverableIds,
    milestoneForm.endDate,
    milestoneForm.startDate,
    milestoneSaving,
    projectCode,
    refreshGantt,
    replaceMilestoneDeliverables,
    requestJson,
  ]);

  const deleteMilestone = useCallback(async () => {
    if (!projectCode || !editingMilestone || editingDefaultMilestone || milestoneSaving) return;

    setMilestoneSaving(true);
    setMilestoneMutationError(null);

    try {
      await requestJson(`http://localhost:3030/projects/${encodeURIComponent(projectCode)}/milestones/${encodeURIComponent(editingMilestoneApiId)}`, {
        method: 'DELETE',
      });
      await applySavedProjection(await refreshGantt());
      closeMilestoneModal();
    } catch (error) {
      setMilestoneMutationError(error.message);
    } finally {
      setMilestoneSaving(false);
    }
  }, [
    applySavedProjection,
    closeMilestoneModal,
    editingDefaultMilestone,
    editingMilestone,
    editingMilestoneApiId,
    milestoneSaving,
    projectCode,
    refreshGantt,
    requestJson,
  ]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await refreshGantt();
    }, 150);
  }, [refreshGantt]);

  useProjectEvents(projectCode, {
    enabled: Boolean(projectCode),
    onEvent: (event) => {
      if (REFRESH_EVENT_TYPES.has(event.type)) {
        scheduleRefresh();
      }
    },
  });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (ganttData?.rows && loadedDraftProjectRef.current !== ganttData.projectCode) {
      loadedDraftProjectRef.current = ganttData.projectCode;
      setDraftRows(ganttData.rows);
    }
  }, [ganttData?.projectCode, ganttData?.rows]);

  if (loading && !ganttData) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)', padding: 24 }}>
        <Alert color="red" title={t('gantt.errorTitle')}>
          {error}
        </Alert>
      </Center>
    );
  }

  if (!ganttData) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)' }}>
        <Text c="dimmed">{t('gantt.empty')}</Text>
      </Center>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', paddingTop: 60 }}>
      <Group
        justify="space-between"
        px="md"
        py="xs"
        style={{
          borderTop: `1px solid ${toolbarBorderColor}`,
          borderBottom: `1px solid ${toolbarBorderColor}`,
          background: toolbarBackground,
        }}
      >
        <Group gap="xs">
          <Button
            size="xs"
            leftSection={<IconPlus size={15} />}
            onClick={openCreateMilestone}
          >
            {t('gantt.createMilestone')}
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          {t('gantt.timelineLabel')}
        </Text>
      </Group>
      <ProjectGantt
        projectGantt={workingGanttData}
        loadDeliverableTasks={loadDeliverableTasks}
        t={t}
        onEditMilestone={openEditMilestone}
      />

      <Modal
        opened={milestoneModalOpened}
        onClose={closeMilestoneModal}
        title={editingMilestone ? t('gantt.editMilestone') : t('gantt.createMilestone')}
        size="lg"
      >
        <Stack gap="md">
          {milestoneMutationError && (
            <Alert color="red" title={t('gantt.errorTitle')}>
              {milestoneMutationError}
            </Alert>
          )}
          <TextInput
            label={t('gantt.fields.name')}
            placeholder={t('gantt.fields.generatedName')}
            value={milestoneForm.name}
            onChange={(event) => setMilestoneForm((prev) => ({ ...prev, name: event.target.value }))}
            disabled
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              type="date"
              label={t('gantt.fields.startDate')}
              value={milestoneForm.startDate}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
            <TextInput
              type="date"
              label={t('gantt.fields.endDate')}
              value={milestoneForm.endDate}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </SimpleGrid>
          <Stack gap="xs">
            <Text fw={500} size="sm">{t('gantt.fields.deliverables')}</Text>
            <Stack gap={6}>
              {selectedDeliverables.length === 0 ? (
                <Text size="sm" c="dimmed">{t('gantt.noAssignedDeliverables')}</Text>
              ) : selectedDeliverables.map((deliverable, index) => (
                <Group
                  key={deliverable.id}
                  justify="space-between"
                  wrap="nowrap"
                  gap="xs"
                  px="sm"
                  py={6}
                  style={{
                    border: `1px solid ${isDarkTheme ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
                    borderRadius: 6,
                    background: isDarkTheme ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
                  }}
                >
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" truncate>
                      {index + 1}. {deliverable.label}
                    </Text>
                    {deliverable.status && (
                      <Text size="xs" c="dimmed">{deliverable.status}</Text>
                    )}
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label={t('gantt.moveDeliverableUp', { name: deliverable.label })}
                      disabled={index === 0}
                      onClick={() => moveDeliverableInMilestone(deliverable.id, -1)}
                    >
                      <IconArrowUp size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label={t('gantt.moveDeliverableDown', { name: deliverable.label })}
                      disabled={index === selectedDeliverables.length - 1}
                      onClick={() => moveDeliverableInMilestone(deliverable.id, 1)}
                    >
                      <IconArrowDown size={15} />
                    </ActionIcon>
                    {!editingDefaultMilestone && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label={t('gantt.removeDeliverable', { name: deliverable.label })}
                        onClick={() => removeDeliverableFromMilestone(deliverable.id)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>
            {!editingDefaultMilestone && (
              <Group align="flex-end" gap="xs" wrap="nowrap">
                <Select
                  label={t('gantt.addDeliverable')}
                  placeholder={t('gantt.fields.selectDeliverables')}
                  data={availableDeliverableOptions}
                  value={deliverableToAddId}
                  onChange={setDeliverableToAddId}
                  searchable
                  clearable
                  nothingFoundMessage={t('gantt.noAvailableDeliverables')}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<IconPlus size={15} />}
                  onClick={addDeliverableToMilestone}
                  disabled={!deliverableToAddId}
                >
                  {t('common.add')}
                </Button>
              </Group>
            )}
          </Stack>
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="red"
              onClick={deleteMilestone}
              disabled={!editingMilestone || editingDefaultMilestone || selectedDeliverables.length > 0 || milestoneSaving}
            >
              {t('common.delete')}
            </Button>
            <Group justify="flex-end">
            <Button variant="default" onClick={closeMilestoneModal}>
              {t('common.cancel')}
            </Button>
              <Button
                onClick={saveMilestoneForm}
                loading={milestoneSaving}
                disabled={!milestoneForm.startDate || !milestoneForm.endDate}
              >
                {t('common.save')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
