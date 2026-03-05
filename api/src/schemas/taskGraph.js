/**
 * Task graph and relation route schemas.
 */

import { codeParam } from './common.js';

const graphTaskItem = {
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Integer primary key' },
    taskId: { type: 'integer', description: 'Same as id' },
    phase: { type: 'integer', description: 'Phase number (e.g. 1, 2, 3)' },
    phaseTaskId: { type: 'string', description: 'Human-readable ID within a deliverable, e.g. "1.2". Rework tasks use "1.2.1" format.' },
    title: { type: 'string' },
    status: { type: 'string' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    deliverableId: { type: 'integer' },
    agentName: { type: 'string', description: 'Agent that claimed this task' },
    prompt: { type: 'string', description: 'Task instructions written by the project leader' },
    notes: { type: 'string', description: 'Append-only agent progress log: "[ISO timestamp] [agent]: message"' },
    isBlocked: { type: 'boolean' },
    isCancelled: { type: 'boolean' },
    coordinationCode: { type: 'string' }
  }
};

const graphRelationItem = {
  type: 'object',
  properties: {
    taskId: { type: 'integer' },
    relatedTaskId: { type: 'integer' },
    relationType: { type: 'string', enum: ['DEPENDS_ON', 'COORDINATES_WITH'] }
  }
};

export const taskGraphSchemas = {
  getProjectGraph: {
    tags: ['task-graph'],
    summary: 'Get full task graph for a project',
    description: 'Returns all tasks and intra-project relations. Polled every 3 s by the UI for live updates.',
    params: codeParam,
    response: {
      200: {
        type: 'object',
        properties: {
          projectId: { type: 'integer' },
          projectCode: { type: 'string' },
          taskGraphLayoutDirection: { type: 'string', enum: ['LR', 'TB'] },
          completionCriteriaStatus: { type: 'string' },
          tasks: { type: 'array', items: graphTaskItem },
          relations: { type: 'array', items: graphRelationItem }
        }
      }
    }
  },

  getTaskRelations: {
    tags: ['task-graph'],
    summary: 'Get task relations',
    description: 'Returns DEPENDS_ON and COORDINATES_WITH relations for a task. Use to understand task dependencies before claiming.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    response: {
      200: { type: 'array', items: graphRelationItem }
    }
  },

  createTaskRelation: {
    tags: ['task-graph'],
    summary: 'Create task relation',
    description: 'Creates DEPENDS_ON (task must wait for relatedTask) or COORDINATES_WITH (tasks should be done together). Cycle detection for DEPENDS_ON. Returns 400 for cycles/self-refs, 409 for duplicates.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id (source task).' }
      }
    },
    body: {
      type: 'object',
      required: ['relatedTaskId', 'relationType'],
      properties: {
        relatedTaskId: { type: 'integer', minimum: 1, description: 'Numeric id of the related task.' },
        relationType: { type: 'string', enum: ['DEPENDS_ON', 'COORDINATES_WITH'], description: 'DEPENDS_ON = this task waits for related; COORDINATES_WITH = do together.' }
      },
      additionalProperties: false
    }
  },

  deleteTaskRelation: {
    tags: ['task-graph'],
    summary: 'Delete task relation',
    description: 'Removes a DEPENDS_ON or COORDINATES_WITH relation between two tasks.',
    params: {
      type: 'object',
      required: ['code', 'taskId', 'relatedTaskId', 'relationType'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric source task id.' },
        relatedTaskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric related task id.' },
        relationType: { type: 'string', enum: ['DEPENDS_ON', 'COORDINATES_WITH'], description: 'Relation type to remove.' }
      }
    }
  },

  checkTaskReadiness: {
    tags: ['task-graph'],
    summary: 'Check task readiness',
    description: 'Returns ready=true when all DEPENDS_ON prerequisites have reached the project\'s completionCriteriaStatus (default COMPLETED). Agents poll this before claiming a task. blockedBy lists tasks still blocking.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          ready: { type: 'boolean' },
          blockedBy: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                taskId: { type: 'integer' },
                status: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },

  getDeliverableGraph: {
    tags: ['task-graph'],
    summary: 'Get deliverable task graph',
    description: 'Returns tasks and relations for one deliverable. Cross-deliverable relations excluded. Primary endpoint for agents monitoring their work. Poll every 3s for live updates.',
    params: {
      type: 'object',
      required: ['code', 'delivId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
        delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          deliverableId: { type: 'integer' },
          projectCode: { type: 'string' },
          taskGraphLayoutDirection: { type: 'string', enum: ['LR', 'TB'] },
          tasks: { type: 'array', items: graphTaskItem },
          relations: { type: 'array', items: graphRelationItem }
        }
      }
    }
  },

  getCoordinationTypes: {
    tags: ['task-graph'],
    summary: 'List coordination types',
    description: 'Returns relation types for COORDINATES_WITH (e.g. for UI display).'
  }
};
