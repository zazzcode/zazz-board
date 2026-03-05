/**
 * Task route schemas (legacy /tasks; prefer deliverable-scoped routes).
 */

import { idParam } from './common.js';
import { tagNamePattern } from './common.js';

export const taskSchemas = {
  getTasks: {
    tags: ['projects'],
    summary: 'List tasks (filtered)',
    description: 'Returns tasks filtered by projectId, status, priority, agentName, or search. Use project-scoped GET /projects/:id/tasks or deliverable-scoped graph for agent workflows.',
    querystring: {
      type: 'object',
      properties: {
        projectId: { type: 'string', pattern: '^[0-9]+$', description: 'Filter by project.' },
        status: { type: 'string', pattern: '^[A-Z_]+$', description: 'Filter by status (e.g. TO_DO, IN_PROGRESS).' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        agentName: { type: 'string', maxLength: 50, description: 'Filter by assigned agent.' },
        search: { type: 'string', minLength: 1, maxLength: 255, description: 'Search in title/description.' }
      }
    }
  },

  getTaskById: {
    tags: ['projects'],
    summary: 'Get task by ID',
    description: 'Returns a single task by numeric id.',
    params: idParam
  },

  createTask: {
    tags: ['projects'],
    summary: 'Create task (legacy)',
    description: 'Creates a task with projectId and deliverableId. Prefer POST /projects/:code/deliverables/:delivId/tasks for deliverable-scoped tasks.',
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        projectId: { type: 'integer', minimum: 1 },
        deliverableId: { type: 'integer', minimum: 1 },
        status: { type: 'string', pattern: '^[A-Z_]+$', default: 'READY' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        agentName: { type: 'string', maxLength: 50, nullable: true },
        position: { type: 'integer', minimum: 0 },
        git_worktree: { type: 'string', maxLength: 255 },
      },
      required: ['title', 'deliverableId'],
      additionalProperties: false
    }
  },

  updateTask: {
    tags: ['projects'],
    summary: 'Update task (legacy)',
    description: 'Full update of task by numeric id. Use PUT /projects/:code/deliverables/:delivId/tasks/:taskId for deliverable-scoped updates.',
    params: idParam,
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        storyPoints: { type: 'integer', minimum: 1, maximum: 21, nullable: true },
        agentName: { type: 'string', maxLength: 50, nullable: true },
        deliverableId: { type: 'integer', minimum: 1, nullable: true },
        prompt: { type: 'string', maxLength: 10000 },
        isBlocked: { type: 'boolean' },
        blockedReason: { type: 'string', maxLength: 1000 },
        gitWorktree: { type: 'string', maxLength: 255 },
        position: { type: 'integer', minimum: 0 },
        tagNames: {
          type: 'array',
          items: { type: 'string', pattern: tagNamePattern },
          uniqueItems: true
        }
      },
      additionalProperties: false
    }
  },

  deleteTask: {
    tags: ['projects'],
    summary: 'Delete task (legacy)',
    description: 'Deletes a task by numeric id.',
    params: idParam
  },

  reorderTask: {
    tags: ['projects'],
    summary: 'Reorder task',
    description: 'Changes task position within its column. Body: { position: number }.',
    params: idParam,
    body: {
      type: 'object',
      properties: {
        position: { type: 'integer', minimum: 0 }
      },
      required: ['position'],
      additionalProperties: false
    }
  },

  setTaskTags: {
    tags: ['projects'],
    summary: 'Set task tags',
    description: 'Replaces all tags on a task. Body: { tagIds: number[] }. Use tag ids from GET /tags.',
    params: {
      type: 'object',
      properties: {
        taskId: { type: 'string', pattern: '^[0-9]+$' }
      },
      required: ['taskId']
    },
    body: {
      type: 'object',
      properties: {
        tagIds: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          uniqueItems: true
        }
      },
      required: ['tagIds'],
      additionalProperties: false
    }
  }
};
