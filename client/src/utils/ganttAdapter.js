const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function parseDate(value) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00`);
}

function addInclusiveEndDay(value) {
  const date = parseDate(value);
  if (!date) return undefined;
  return new Date(date.getTime() + DAY_MS);
}

function getInclusiveDurationDays(startValue, endValue) {
  const start = parseDate(startValue);
  const end = addInclusiveEndDay(endValue);
  if (!start || !end) return undefined;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

function isSameLocalDay(left, right) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function getElapsedWholeWeeks(date, startDate) {
  if (!date || !startDate) return 0;
  return Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / WEEK_MS));
}

function getTimelinePeriodNumber(date, timelineStartDate, periodNumberStart = 1) {
  return getElapsedWholeWeeks(date, timelineStartDate) + Number(periodNumberStart || 0);
}

function getTimelineSprintNumber(date, timelineStartDate, sprintLengthWeeks) {
  const length = Math.max(1, Number(sprintLengthWeeks || 2));
  return Math.floor(getElapsedWholeWeeks(date, timelineStartDate) / length) + 1;
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function getGanttRowText(row, t) {
  if (row.labelKey && t) return t(row.labelKey, row.labelParams || {});
  return row.displayName || row.name || row.id;
}

export function createCurrentDateHighlighter(currentDate = new Date()) {
  return (date) => (isSameLocalDay(date, currentDate) ? 'zazz-gantt-today-column' : '');
}

export function getDateChartOffset(ganttState, targetDate) {
  const scales = ganttState?._scales;
  const start = ganttState?._start;
  const cellWidth = Number(ganttState?.cellWidth || 0);

  if (!scales?.diff || !start || !targetDate || !cellWidth) return null;

  return Math.round(scales.diff(targetDate, start, 'hour') * cellWidth);
}

export function getCenteredDateScrollLeft(ganttState, targetDate, visibleWidth) {
  const scales = ganttState?._scales;
  const chartWidth = Number(visibleWidth || ganttState?._chartWidth || 0);
  const dateOffset = getDateChartOffset(ganttState, targetDate);

  if (dateOffset === null) return null;

  const rawLeft = dateOffset - (chartWidth / 2);
  const maxLeft = Number.isFinite(scales.width - chartWidth) ? Math.max(scales.width - chartWidth, 0) : rawLeft;
  return clampNumber(rawLeft, 0, maxLeft);
}

function getTaskType(row) {
  return row.entityType === 'task' ? 'task' : 'task';
}

export function toSvarTaskRow(row, t) {
  const completed = Boolean(row.completed);
  const progress = completed ? 100 : Number(row.progress || 0);

  return {
    id: row.id,
    text: getGanttRowText(row, t),
    parent: row.parentId || 0,
    start: parseDate(row.startDate),
    end: addInclusiveEndDay(row.endDate),
    duration: getInclusiveDurationDays(row.startDate, row.endDate),
    progress,
    type: getTaskType(row),
    open: row.entityType === 'milestone',
    lazy: row.entityType === 'deliverable' && Boolean(row.lazyTasks),
    zazzEntityType: row.entityType,
    zazzCompleted: completed,
    zazzStatus: row.status,
    zazzCssClass: completed ? 'zazz-gantt-complete' : `zazz-gantt-${row.entityType}`,
    data: row,
  };
}

export function toSvarLink(link) {
  return {
    id: link.id,
    source: link.sourceId,
    target: link.targetId,
    type: link.type || 'e2s',
  };
}

export function buildGanttColumns(t) {
  return [
    {
      id: 'text',
      header: t ? t('gantt.columns.item') : 'Item',
      flexgrow: 1,
      width: 280,
    },
    {
      id: 'zazzStatus',
      header: t ? t('gantt.columns.status') : 'Status',
      width: 120,
    },
    {
      id: 'progress',
      header: t ? t('gantt.columns.progress') : 'Progress',
      width: 90,
      align: 'right',
      template: (task) => `${Math.round(task.progress || 0)}%`,
    },
  ];
}

export function buildGanttScales(timeline = {}, fallbackStartDate) {
  const timelineStartDate = parseDate(timeline.periodStartDate || timeline.sprintStartDate) || fallbackStartDate;
  const sprintLengthWeeks = Math.max(1, Number(timeline.sprintLengthWeeks || 2));
  const periodNumberStart = Number(timeline.periodNumberStart || 1);
  const sprintLabelPrefix = timeline.sprintLabelPrefix || 'Sprint';
  const weekLabelPrefix = timeline.weekLabelPrefix || 'W';
  const unit = timeline.unit || 'sprint';
  const monthScale = { unit: 'month', step: 1, format: formatMonthYear };
  const showMonthHeader = timeline.showMonthHeader !== false;
  const showSprintHeader = timeline.showSprintHeader !== false;
  const showWeekHeader = timeline.showWeekHeader !== false;
  const weekNumberScale = {
    unit: 'week',
    step: 1,
    format: (date) => `${weekLabelPrefix}${getTimelinePeriodNumber(date, timelineStartDate, periodNumberStart)}`,
  };
  const scales = [];

  if (showMonthHeader) scales.push(monthScale);

  if (unit === 'date') {
    if (showWeekHeader) scales.push({ unit: 'week', step: 1, format: 'dd MMM' });
    return scales.length > 0 ? scales : [monthScale];
  }

  if (unit === 'week') {
    if (showWeekHeader) scales.push(weekNumberScale);
    return scales.length > 0 ? scales : [weekNumberScale];
  }

  if (showSprintHeader) {
    scales.push({
      unit: 'week',
      step: sprintLengthWeeks,
      format: (date) => {
        const sprintNumber = getTimelineSprintNumber(date, timelineStartDate, sprintLengthWeeks) + periodNumberStart - 1;
        return `${sprintLabelPrefix} ${sprintNumber}`;
      },
    });
  }
  if (showWeekHeader) scales.push(weekNumberScale);
  return scales.length > 0 ? scales : [weekNumberScale];
}

export function toSvarGantt(projectGantt, t) {
  const rows = projectGantt?.rows || [];
  const links = projectGantt?.links || [];

  const projectStart = parseDate(projectGantt?.range?.startDate);

  return {
    tasks: rows.map((row) => toSvarTaskRow(row, t)),
    links: links.map(toSvarLink),
    columns: buildGanttColumns(t),
    scales: buildGanttScales(projectGantt?.timeline, projectStart),
    projectStart,
    projectEnd: addInclusiveEndDay(projectGantt?.range?.endDate),
  };
}

export function toSvarGanttExpansion(expansion, t) {
  return {
    tasks: (expansion?.rows || []).map((row) => toSvarTaskRow(row, t)),
    links: (expansion?.links || []).map(toSvarLink),
  };
}
