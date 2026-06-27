const ganttCodeParam = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
  },
};

const deliverableTaskParam = {
  type: 'object',
  required: ['code', 'deliverableId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
    deliverableId: { type: 'string', minLength: 1, description: 'Mock deliverable row id suffix.' },
  },
};

const ganttRowSchema = {
  type: 'object',
  required: ['id', 'entityType', 'startDate', 'endDate', 'status', 'completed'],
  properties: {
    id: { type: 'string' },
    entityType: { type: 'string', enum: ['milestone', 'deliverable', 'task'] },
    parentId: { type: 'string' },
    labelKey: { type: 'string' },
    labelParams: { type: 'object', additionalProperties: true },
    displayName: { type: 'string' },
    isDefault: { type: 'boolean' },
    deliverableId: { type: 'string' },
    deliverableCode: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    status: { type: 'string' },
    progress: { type: 'number', minimum: 0, maximum: 100 },
    completed: { type: 'boolean' },
    taskCount: { type: 'integer', minimum: 0 },
    lazyTasks: { type: 'boolean' },
  },
  additionalProperties: false,
};

const ganttLinkSchema = {
  type: 'object',
  required: ['id', 'sourceId', 'targetId', 'type'],
  properties: {
    id: { type: 'string' },
    sourceId: { type: 'string' },
    targetId: { type: 'string' },
    type: { type: 'string', enum: ['s2s', 's2e', 'e2s', 'e2e'] },
    relationType: { type: 'string' },
  },
  additionalProperties: false,
};

const ganttSettingsSchema = {
  type: 'object',
  required: [
    'projectCode',
    'timelineMode',
    'showDateLabels',
    'showDefaultMilestone',
    'periodStartDate',
    'sprintLengthWeeks',
    'periodNumberStart',
    'sprintLabelPrefix',
    'weekLabelPrefix',
  ],
  properties: {
    projectCode: { type: 'string' },
    timelineMode: { type: 'string', enum: ['dates', 'weeks', 'sprint'] },
    showDateLabels: { type: 'boolean' },
    showDefaultMilestone: { type: 'boolean' },
    periodStartDate: { type: 'string', format: 'date' },
    sprintLengthWeeks: { type: 'integer', minimum: 1, maximum: 12 },
    periodNumberStart: { type: 'integer', minimum: 0 },
    sprintLabelPrefix: { type: 'string', minLength: 1, maxLength: 32 },
    weekLabelPrefix: { type: 'string', minLength: 1, maxLength: 16 },
  },
  additionalProperties: false,
};

const updateGanttSettingsBodySchema = {
  type: 'object',
  required: [
    'timelineMode',
    'showDateLabels',
    'showDefaultMilestone',
    'periodStartDate',
    'sprintLengthWeeks',
    'periodNumberStart',
    'sprintLabelPrefix',
    'weekLabelPrefix',
  ],
  properties: {
    timelineMode: { type: 'string', enum: ['dates', 'weeks', 'sprint'] },
    showDateLabels: { type: 'boolean' },
    showDefaultMilestone: { type: 'boolean' },
    periodStartDate: { type: 'string', format: 'date' },
    sprintLengthWeeks: { type: 'integer', minimum: 1, maximum: 12 },
    periodNumberStart: { type: 'integer', minimum: 0 },
    sprintLabelPrefix: { type: 'string', minLength: 1, maxLength: 32 },
    weekLabelPrefix: { type: 'string', minLength: 1, maxLength: 16 },
  },
  additionalProperties: false,
};

const ganttPayloadSchema = {
  type: 'object',
  required: ['projectCode', 'rows', 'links'],
  properties: {
    projectCode: { type: 'string' },
    projectName: { type: 'string' },
    range: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
      additionalProperties: false,
    },
    timeline: {
      type: 'object',
      properties: {
        unit: { type: 'string', enum: ['date', 'week', 'sprint'] },
        showDateLabels: { type: 'boolean' },
        showDefaultMilestone: { type: 'boolean' },
        periodStartDate: { type: 'string', format: 'date' },
        periodNumberStart: { type: 'integer', minimum: 0 },
        sprintStartDate: { type: 'string', format: 'date' },
        sprintLengthWeeks: { type: 'integer', minimum: 1 },
        sprintLabelPrefix: { type: 'string' },
        weekLabelPrefix: { type: 'string' },
      },
      additionalProperties: false,
    },
    rows: { type: 'array', items: ganttRowSchema },
    links: { type: 'array', items: ganttLinkSchema },
  },
  additionalProperties: false,
};

const deliverableTasksPayloadSchema = {
  type: 'object',
  required: ['projectCode', 'deliverableId', 'rows', 'links'],
  properties: {
    projectCode: { type: 'string' },
    deliverableId: { type: 'string' },
    rows: { type: 'array', items: ganttRowSchema },
    links: { type: 'array', items: ganttLinkSchema },
  },
  additionalProperties: false,
};

export const ganttSchemas = {
  getProjectGantt: {
    tags: ['gantt'],
    summary: 'Get mocked project Gantt projection',
    description: 'Returns milestone and deliverable rows plus deliverable-level links for the project Gantt view.',
    params: ganttCodeParam,
    response: {
      200: ganttPayloadSchema,
      404: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  getDeliverableGanttTasks: {
    tags: ['gantt'],
    summary: 'Get mocked task rows for an expanded Gantt deliverable',
    description: 'Returns task rows and task-level links for one expanded deliverable in the project Gantt view.',
    params: deliverableTaskParam,
    response: {
      200: deliverableTasksPayloadSchema,
      404: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  getProjectGanttSettings: {
    tags: ['gantt'],
    summary: 'Get mocked project Gantt settings',
    description: 'Returns project-owned Gantt timeline settings for the project configuration UI.',
    params: ganttCodeParam,
    response: {
      200: ganttSettingsSchema,
      404: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  updateProjectGanttSettings: {
    tags: ['gantt'],
    summary: 'Update mocked project Gantt settings',
    description: 'Updates in-memory project-owned Gantt timeline settings for the UI contract.',
    params: ganttCodeParam,
    body: updateGanttSettingsBodySchema,
    response: {
      200: ganttSettingsSchema,
      404: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
};
