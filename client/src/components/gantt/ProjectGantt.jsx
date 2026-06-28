import { useCallback, useMemo, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { Gantt, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import { toSvarGantt, toSvarGanttExpansion } from '../../utils/ganttAdapter.js';
import './ProjectGantt.css';

function getDeliverableIdFromSvarRow(row) {
  const deliverableId = row?.data?.deliverableId || row?.id?.replace(/^deliverable:/, '');
  return deliverableId || null;
}

function normalizeSvarId(id) {
  return String(id || '').replace(/^:/, '');
}

function isMilestoneRow(row) {
  return row?.zazzEntityType === 'milestone' || row?.data?.entityType === 'milestone';
}

function buildColumnsWithMilestoneActions(columns, t, onEditMilestone) {
  if (!onEditMilestone) return columns;

  const actionsColumn = {
    id: 'zazzMilestoneActions',
    header: '',
    width: 42,
    align: 'right',
    cell: ({ row }) => {
      if (!isMilestoneRow(row)) return null;

      return (
        <div className="zazz-gantt-row-actions">
          <button
            type="button"
            className="zazz-gantt-row-action"
            title={t('gantt.editMilestone')}
            aria-label={t('gantt.editMilestone')}
            onClick={(event) => {
              event.stopPropagation();
              onEditMilestone(row.data || row);
            }}
          >
            <IconEdit size={15} stroke={1.8} />
          </button>
        </div>
      );
    },
  };

  const textIndex = columns.findIndex((column) => column.id === 'text');
  if (textIndex === -1) return [...columns, actionsColumn];

  return [
    ...columns.slice(0, textIndex + 1),
    actionsColumn,
    ...columns.slice(textIndex + 1),
  ];
}

export function ProjectGantt({ projectGantt, loadDeliverableTasks, t, onEditMilestone }) {
  const { colorScheme } = useMantineColorScheme();
  const apiRef = useRef(null);
  const loadedDeliverablesRef = useRef(new Set());
  const svarData = useMemo(() => toSvarGantt(projectGantt, t), [projectGantt, t]);
  const columns = useMemo(
    () => buildColumnsWithMilestoneActions(svarData.columns, t, onEditMilestone),
    [onEditMilestone, svarData.columns, t]
  );
  const Theme = colorScheme === 'dark' ? WillowDark : Willow;

  const handleInit = useCallback((api) => {
    apiRef.current = api;
  }, []);

  const handleRequestData = useCallback(async (event) => {
    const eventId = normalizeSvarId(event?.id);
    const row = svarData.tasks.find((task) => normalizeSvarId(task.id) === eventId);
    const deliverableId = getDeliverableIdFromSvarRow(row);
    if (!deliverableId || loadedDeliverablesRef.current.has(deliverableId)) return;

    const expansion = await loadDeliverableTasks(deliverableId);
    if (!expansion || !apiRef.current) return;

    loadedDeliverablesRef.current.add(deliverableId);
    const expandedData = toSvarGanttExpansion(expansion, t);
    apiRef.current.exec('provide-data', {
      id: event.id,
      data: {
        ...expandedData,
        tasks: expandedData.tasks.map((task) => ({ ...task, parent: event.id })),
      },
    });
  }, [loadDeliverableTasks, svarData.tasks, t]);

  return (
    <div className="zazz-gantt-shell" data-theme={colorScheme} data-testid="project-gantt">
      <Theme>
        <Gantt
          tasks={svarData.tasks}
          links={svarData.links}
          columns={columns}
          scales={svarData.scales}
          projectStart={svarData.projectStart}
          projectEnd={svarData.projectEnd}
          readonly
          cellHeight={38}
          cellWidth={72}
          scaleHeight={52}
          gridWidth={500}
          init={handleInit}
          onRequestData={handleRequestData}
          taskTemplate={({ data }) => (
            <div
              className={`zazz-gantt-task ${data.zazzCssClass || ''}`}
              title={data.text}
            >
              <span className="zazz-gantt-task-label">{data.text}</span>
            </div>
          )}
        />
      </Theme>
    </div>
  );
}
