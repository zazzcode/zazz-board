import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { Gantt, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import {
  createCurrentDateHighlighter,
  getDateChartOffset,
  getCenteredDateScrollLeft,
  toSvarGantt,
  toSvarGanttExpansion,
} from '../../utils/ganttAdapter.js';
import './ProjectGantt.css';

const GANTT_GRID_WIDTH = 500;
const TODAY_SCROLL_LISTENER_TAG = 'zazz-gantt-today-scroll-listener';

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

function isDeliverableRow(row) {
  return row?.zazzEntityType === 'deliverable' || row?.data?.entityType === 'deliverable';
}

function resolveSourceRow(row, getSourceRowById) {
  return getSourceRowById(row.id) || row.data || row;
}

function getEntityEditLabel(row, t) {
  if (isMilestoneRow(row)) return t('gantt.editMilestone');
  if (isDeliverableRow(row)) return t('gantt.editDeliverable');
  return null;
}

function dispatchEntityEdit(row, handlers, getSourceRowById) {
  if (isMilestoneRow(row) && handlers.onEditMilestone) {
    handlers.onEditMilestone(resolveSourceRow(row, getSourceRowById));
    return;
  }

  if (isDeliverableRow(row) && handlers.onEditDeliverable) {
    handlers.onEditDeliverable(resolveSourceRow(row, getSourceRowById));
  }
}

function buildColumnsWithEntityActions(columns, t, handlers, getSourceRowById) {
  const canEditEntities = handlers.onEditMilestone || handlers.onEditDeliverable;
  if (!canEditEntities) return columns;

  const textColumn = columns.find((column) => column.id === 'text');
  const interactiveTextColumn = textColumn
    ? {
        ...textColumn,
        cell: ({ row }) => {
          const label = getEntityEditLabel(row, t);
          const sourceRow = resolveSourceRow(row, getSourceRowById);
          const text = row.text || sourceRow.displayName || sourceRow.name || row.id;

          if (!label) return text;

          return (
            <button
              type="button"
              className="zazz-gantt-row-title"
              title={label}
              aria-label={`${label}: ${text}`}
              onDoubleClick={(event) => {
                event.stopPropagation();
                dispatchEntityEdit(row, handlers, getSourceRowById);
              }}
            >
              {text}
            </button>
          );
        },
      }
    : null;

  const actionsColumn = {
    id: 'zazzEntityActions',
    header: '',
    width: 42,
    align: 'right',
    cell: ({ row }) => {
      const label = getEntityEditLabel(row, t);
      if (!label) return null;

      return (
        <div className="zazz-gantt-row-actions">
          <button
            type="button"
            className="zazz-gantt-row-action"
            title={label}
            aria-label={label}
            onClick={(event) => {
              event.stopPropagation();
              dispatchEntityEdit(row, handlers, getSourceRowById);
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
    ...columns.slice(0, textIndex),
    interactiveTextColumn,
    actionsColumn,
    ...columns.slice(textIndex + 1),
  ];
}

export function ProjectGantt({
  projectGantt,
  loadDeliverableTasks,
  t,
  onEditMilestone,
  onEditDeliverable,
}) {
  const { colorScheme } = useMantineColorScheme();
  const apiRef = useRef(null);
  const chartWidthRef = useRef(0);
  const centeredProjectionRef = useRef(null);
  const loadedDeliverablesRef = useRef(new Set());
  const [todayMarkerLeft, setTodayMarkerLeft] = useState(null);
  const currentDate = useMemo(() => new Date(), []);
  const highlightTime = useMemo(() => createCurrentDateHighlighter(currentDate), [currentDate]);
  const svarData = useMemo(() => toSvarGantt(projectGantt, t), [projectGantt, t]);
  const sourceRowsById = useMemo(() => new Map(
    (projectGantt?.rows || []).map((row) => [normalizeSvarId(row.id), row])
  ), [projectGantt?.rows]);
  const getSourceRowById = useCallback((id) => (
    sourceRowsById.get(normalizeSvarId(id))
  ), [sourceRowsById]);
  const editHandlers = useMemo(() => ({
    onEditMilestone,
    onEditDeliverable,
  }), [onEditDeliverable, onEditMilestone]);
  const columns = useMemo(
    () => buildColumnsWithEntityActions(svarData.columns, t, editHandlers, getSourceRowById),
    [editHandlers, getSourceRowById, svarData.columns, t]
  );
  const Theme = colorScheme === 'dark' ? WillowDark : Willow;
  const projectionKey = projectGantt?.projectCode || '';

  const updateTodayMarker = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const state = api.getState?.();
    const dateOffset = getDateChartOffset(state, currentDate);
    if (dateOffset === null) {
      setTodayMarkerLeft(null);
      return;
    }

    const scrollLeft = Number(state?.scrollLeft || 0);
    const gridWidth = Number(state?.gridWidth || GANTT_GRID_WIDTH);
    const markerLeft = gridWidth + dateOffset - scrollLeft;
    const chartWidth = Number(chartWidthRef.current || state?._chartWidth || 0);

    setTodayMarkerLeft(
      markerLeft >= gridWidth && (!chartWidth || markerLeft <= gridWidth + chartWidth)
        ? markerLeft
        : null
    );
  }, [currentDate]);

  const centerOnCurrentDate = useCallback(() => {
    const api = apiRef.current;
    if (!api || centeredProjectionRef.current === projectionKey) return;

    const state = api.getState?.();
    const centeredLeft = getCenteredDateScrollLeft(state, currentDate, chartWidthRef.current);

    if (centeredLeft === null) return;

    centeredProjectionRef.current = projectionKey;
    api.exec('scroll-chart', { left: centeredLeft });
    requestAnimationFrame(updateTodayMarker);
  }, [currentDate, projectionKey, updateTodayMarker]);

  const handleInit = useCallback((api) => {
    apiRef.current?.detach?.(TODAY_SCROLL_LISTENER_TAG);
    apiRef.current = api;
    api.on?.('scroll-chart', () => requestAnimationFrame(updateTodayMarker), {
      tag: TODAY_SCROLL_LISTENER_TAG,
    });
    requestAnimationFrame(centerOnCurrentDate);
  }, [centerOnCurrentDate, updateTodayMarker]);

  const handleGanttWidthChange = useCallback((width) => {
    chartWidthRef.current = Number(width || 0);
    requestAnimationFrame(centerOnCurrentDate);
    requestAnimationFrame(updateTodayMarker);
  }, [centerOnCurrentDate, updateTodayMarker]);

  useEffect(() => {
    centeredProjectionRef.current = null;
    setTodayMarkerLeft(null);
    requestAnimationFrame(centerOnCurrentDate);
  }, [centerOnCurrentDate, projectionKey]);

  useEffect(() => () => {
    apiRef.current?.detach?.(TODAY_SCROLL_LISTENER_TAG);
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

  const handleTaskDoubleClick = useCallback((task) => {
    dispatchEntityEdit(task, editHandlers, getSourceRowById);
  }, [editHandlers, getSourceRowById]);

  return (
    <div className="zazz-gantt-shell" data-theme={colorScheme} data-testid="project-gantt">
      <Theme>
        <Gantt
          tasks={svarData.tasks}
          links={svarData.links}
          columns={columns}
          scales={svarData.scales}
          start={svarData.projectStart}
          end={svarData.projectEnd}
          projectStart={svarData.projectStart}
          projectEnd={svarData.projectEnd}
          autoScale={false}
          lengthUnit="day"
          durationUnit="day"
          readonly
          cellHeight={38}
          cellWidth={72}
          scaleHeight={52}
          gridWidth={GANTT_GRID_WIDTH}
          highlightTime={highlightTime}
          init={handleInit}
          onGanttWidthChange={handleGanttWidthChange}
          onRequestData={handleRequestData}
          taskTemplate={({ data }) => (
            <div
              className={`zazz-gantt-task ${data.zazzCssClass || ''}`}
              title={data.text}
              onDoubleClick={(event) => {
                event.stopPropagation();
                handleTaskDoubleClick(data);
              }}
            >
              <span className="zazz-gantt-task-label">{data.text}</span>
            </div>
          )}
        />
      </Theme>
      {todayMarkerLeft !== null ? (
        <div
          aria-hidden="true"
          className="zazz-gantt-today-marker"
          style={{ left: `${todayMarkerLeft}px` }}
        />
      ) : null}
    </div>
  );
}
