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

function getTaskType(row) {
  if (row.entityType === 'milestone') return 'summary';
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

  if (unit === 'date') {
    return [
      monthScale,
      { unit: 'week', step: 1, format: 'dd MMM' },
    ];
  }

  if (unit === 'week') {
    return [
      monthScale,
      {
        unit: 'week',
        step: 1,
        format: (date) => `${weekLabelPrefix}${getTimelinePeriodNumber(date, timelineStartDate, periodNumberStart)}`,
      },
    ];
  }

  return [
    monthScale,
    {
      unit: 'week',
      step: sprintLengthWeeks,
      format: (date) => {
        const sprintNumber = getTimelineSprintNumber(date, timelineStartDate, sprintLengthWeeks) + periodNumberStart - 1;
        return `${sprintLabelPrefix} ${sprintNumber}`;
      },
    },
    {
      unit: 'week',
      step: 1,
      format: (date) => `${weekLabelPrefix}${getTimelinePeriodNumber(date, timelineStartDate, periodNumberStart)}`,
    },
  ];
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
