const projectCodeParam = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
  },
};

const milestoneParam = {
  type: 'object',
  required: ['code', 'milestoneId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$' },
    milestoneId: { type: 'string', pattern: '^\\d+$' },
  },
};

const deliverableParam = {
  type: 'object',
  required: ['code', 'id'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$' },
    id: { type: 'string', pattern: '^\\d+$' },
  },
};

const deliverableTaskParam = {
  type: 'object',
  required: ['code', 'deliverableId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$' },
    deliverableId: { type: 'string', pattern: '^\\d+$' },
  },
};

const nullableIsoDateTime = { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] };

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
    milestoneId: { type: 'integer' },
    milestoneOrder: { type: 'integer' },
    deliverableId: { type: 'string' },
    deliverableCode: { type: 'string' },
    deliverableOrder: { type: 'integer' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    plannedStartAt: nullableIsoDateTime,
    plannedCompletionAt: nullableIsoDateTime,
    actualStartAt: nullableIsoDateTime,
    actualCompletionAt: nullableIsoDateTime,
    status: { type: 'string' },
    statusCategory: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] },
    progress: { type: 'number', minimum: 0, maximum: 100 },
    completed: { type: 'boolean' },
    blocked: { type: 'boolean' },
    taskCount: { type: 'integer', minimum: 0 },
    completedTaskCount: { type: 'integer', minimum: 0 },
    blockedTaskCount: { type: 'integer', minimum: 0 },
    taskStatusCounts: {
      type: 'object',
      additionalProperties: { type: 'integer', minimum: 0 },
    },
    lazyTasks: { type: 'boolean' },
  },
  additionalProperties: false,
};

const ganttLinkSchema = {
  type: 'object',
  required: ['id', 'sourceId', 'targetId', 'type', 'relationType'],
  properties: {
    id: { type: 'string' },
    sourceId: { type: 'string' },
    targetId: { type: 'string' },
    type: { type: 'string', enum: ['s2s', 's2e', 'e2s', 'e2e'] },
    relationType: { type: 'string', enum: ['DEPENDS_ON'] },
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
    updatedAt: { type: 'string', format: 'date-time' },
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
  required: ['projectCode', 'rows', 'links', 'timeline', 'range', 'version', 'updatedAt'],
  properties: {
    projectCode: { type: 'string' },
    projectName: { type: 'string' },
    version: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    range: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
      additionalProperties: false,
    },
    timeline: {
      type: 'object',
      required: [
        'unit',
        'showDateLabels',
        'showDefaultMilestone',
        'periodStartDate',
        'periodNumberStart',
        'sprintStartDate',
        'sprintLengthWeeks',
        'sprintLabelPrefix',
        'weekLabelPrefix',
      ],
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

const milestoneSchema = {
  type: 'object',
  required: ['id', 'projectId', 'startDate', 'endDate', 'isDefault', 'status', 'labelKey', 'labelParams'],
  properties: {
    id: { type: 'integer' },
    projectId: { type: 'integer' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    isDefault: { type: 'boolean' },
    status: { type: 'string', enum: ['PLANNING', 'PENDING', 'IN_PROGRESS', 'DONE'] },
    labelKey: { type: 'string' },
    labelParams: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
};

const milestoneBody = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['PLANNING', 'PENDING', 'IN_PROGRESS', 'DONE'] },
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

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } },
  additionalProperties: true,
};

export const ganttSchemas = {
  getProjectGantt: {
    tags: ['gantt'],
    summary: 'Get project Gantt projection',
    description: 'Returns database-backed milestone and deliverable rows plus deliverable-level links for the project Gantt view.',
    params: projectCodeParam,
    response: { 200: ganttPayloadSchema, 404: errorResponse },
  },
  getProjectGanttSettings: {
    tags: ['gantt'],
    summary: 'Get project Gantt settings',
    params: projectCodeParam,
    response: { 200: ganttSettingsSchema, 404: errorResponse },
  },
  updateProjectGanttSettings: {
    tags: ['gantt'],
    summary: 'Update project Gantt settings',
    params: projectCodeParam,
    body: updateGanttSettingsBodySchema,
    response: { 200: ganttSettingsSchema, 400: errorResponse, 404: errorResponse },
  },
  listMilestones: {
    tags: ['milestones'],
    summary: 'List project milestones',
    params: projectCodeParam,
    response: { 200: { type: 'array', items: milestoneSchema }, 404: errorResponse },
  },
  createMilestone: {
    tags: ['milestones'],
    summary: 'Create a planned project milestone',
    params: projectCodeParam,
    body: milestoneBody,
    response: { 201: milestoneSchema, 400: errorResponse, 404: errorResponse },
  },
  updateMilestone: {
    tags: ['milestones'],
    summary: 'Update a project milestone',
    params: milestoneParam,
    body: milestoneBody,
    response: { 200: milestoneSchema, 400: errorResponse, 404: errorResponse },
  },
  deleteMilestone: {
    tags: ['milestones'],
    summary: 'Delete an empty non-default project milestone',
    params: milestoneParam,
    response: {
      200: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' } },
        additionalProperties: false,
      },
      400: errorResponse,
      404: errorResponse,
    },
  },
  updateDeliverableMilestone: {
    tags: ['gantt'],
    summary: 'Move a deliverable to a project milestone',
    params: deliverableParam,
    body: {
      type: 'object',
      required: ['milestoneId'],
      properties: { milestoneId: { type: 'integer', minimum: 1 } },
      additionalProperties: false,
    },
    response: { 200: ganttPayloadSchema, 400: errorResponse, 404: errorResponse },
  },
  replaceMilestoneDeliverables: {
    tags: ['milestones'],
    summary: 'Replace a planned milestone deliverable order',
    params: milestoneParam,
    body: {
      type: 'object',
      required: ['deliverableIds'],
      properties: {
        deliverableIds: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
        },
        expectedVersion: { type: 'string' },
      },
      additionalProperties: false,
    },
    response: { 200: ganttPayloadSchema, 400: errorResponse, 404: errorResponse, 409: errorResponse },
  },
  getDeliverableGanttTasks: {
    tags: ['gantt'],
    summary: 'Get task rows for an expanded Gantt deliverable',
    params: deliverableTaskParam,
    response: { 200: deliverableTasksPayloadSchema, 404: errorResponse },
  },
};
