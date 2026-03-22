/**
 * Project and project-scoped task route schemas.
 */

import { idParam, taskResponseSchema } from './common.js';

export const projectSchemas = {
  getProjects: {
    tags: ['projects'],
    summary: 'List projects',
    description: 'Returns all projects. Filter by leaderId or search in title/description.',
    querystring: {
      type: 'object',
      properties: {
        leaderId: { type: 'string', pattern: '^[0-9]+$', description: 'Filter by project leader user id.' },
        search: { type: 'string', minLength: 1, maxLength: 255, description: 'Search in project title/description.' }
      }
    }
  },

  getProjectById: {
    tags: ['projects'],
    summary: 'Get project by ID',
    description: 'Returns a single project by numeric id. Use GET /projects for list.',
    params: idParam
  },

  createProject: {
    tags: ['projects'],
    summary: 'Create project',
    description: 'Creates a new project. code must be uppercase letters only (e.g. ZAZZ). leaderId is the user id of the project owner.',
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255, description: 'Project name.' },
        code: {
          type: 'string',
          minLength: 2,
          maxLength: 10,
          pattern: '^[A-Z]+$',
          description: 'Project code (e.g. ZAZZ). Uppercase letters only. Immutable after create.'
        },
        description: { type: 'string', maxLength: 5000, description: 'Optional project description.' },
        leaderId: { type: 'integer', minimum: 1, description: 'User id of project owner.' }
      },
      required: ['title', 'code', 'leaderId'],
      additionalProperties: false
    }
  },

  updateProject: {
    tags: ['projects'],
    summary: 'Update project',
    description: 'Updates project title, description, leaderId, completionCriteriaStatus, or taskGraphLayoutDirection. Project code is immutable.',
    params: idParam,
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        leaderId: { type: 'integer', minimum: 1, description: 'User id of new project owner.' },
        completionCriteriaStatus: { type: 'string', maxLength: 25, nullable: true, description: 'Status that counts as "done" for dependencies (default COMPLETED).' },
        taskGraphLayoutDirection: { type: 'string', enum: ['LR', 'TB'], description: 'Graph layout: LR=left-right, TB=top-bottom.' }
      },
      additionalProperties: false
    }
  },

  deleteProject: {
    tags: ['projects'],
    summary: 'Delete project',
    description: 'Deletes a project by numeric id. Cascades to deliverables and tasks.',
    params: idParam
  },

  getProjectTasks: {
    tags: ['projects'],
    summary: 'List project tasks',
    description: 'Returns tasks for a project by numeric project id. Filter by status or priority via query params.',
    params: idParam,
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', pattern: '^[A-Z_]+$', description: 'Filter by task status.' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Filter by priority.' }
      }
    }
  },

  updateTaskStatus: {
    tags: ['projects'],
    summary: 'Update task status',
    description: 'Changes task status in the workflow. Use to: pick up a task (TO_DO→IN_PROGRESS), complete it (IN_PROGRESS→COMPLETED), or move to QA. Valid transitions depend on the project\'s task workflow. Use project code (e.g. ZAZZ) and numeric taskId.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', pattern: '^[A-Z_]+$' }
      }
    },
    response: {
      200: { description: 'Task status updated', ...taskResponseSchema }
    }
  },

  updateTask: {
    tags: ['projects'],
    summary: 'Update task',
    description: 'Full update of task fields (title, status, prompt, agentName, etc.). Send only fields to change. Use project code (e.g. ZAZZ) and numeric taskId.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        storyPoints: { type: 'number', nullable: true },
        agentName: { type: 'string', maxLength: 50, nullable: true },
        prompt: { type: 'string', nullable: true },
        isBlocked: { type: 'boolean' },
        blockedReason: { type: 'string', nullable: true },
        gitWorktree: { type: 'string', nullable: true },
        deliverableId: { type: 'number', nullable: false },
        tagNames: { type: 'array', items: { type: 'string' } }
      }
    },
    response: {
      200: { description: 'Task updated', ...taskResponseSchema }
    }
  },

  deleteTask: {
    tags: ['projects'],
    summary: 'Delete task (project-scoped)',
    description: 'Deletes a task. Use project code (e.g. ZAZZ) and numeric taskId. Verifies task belongs to project.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },

  createDeliverableTask: {
    tags: ['projects'],
    summary: 'Create task in deliverable',
    description: 'Creates a task within a deliverable. delivId is the numeric id from the create deliverable response (not the deliverable code string). The deliverable must be approved before creating tasks. Include prompt with goal, instructions, and acceptance criteria. Use phase and phaseStep to align with PLAN structure (e.g. phase 1, phaseStep "1.2").',
    params: {
      type: 'object',
      required: ['code', 'delivId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        delivId: { type: 'string', pattern: '^[0-9]+$', description: 'Numeric deliverable id from create deliverable response. Use the id field, not the deliverable code string.' }
      }
    },
    body: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255, description: 'Task title.' },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', pattern: '^[A-Z_]+$', description: 'Initial status (default TO_DO).' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        agentName: { type: 'string', maxLength: 50, description: 'Agent name if pre-assigning.' },
        storyPoints: { type: 'integer', minimum: 1, maximum: 21 },
        position: { type: 'integer', minimum: 0 },
        phaseStep: {
          type: 'string',
          maxLength: 20,
          description: 'Phase step from PLAN (e.g. "1.2"). Auto-generated from phase if omitted. Use "1.2.1" for rework tasks.'
        },
        prompt: { type: 'string', maxLength: 10000, description: 'Goal, instructions, and acceptance criteria for the agent.' },
        gitWorktree: { type: 'string', maxLength: 255 },
        phase: { type: 'integer', minimum: 1, description: 'Phase number from PLAN (e.g. 1, 2, 3).' },
        dependencies: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          uniqueItems: true,
          description: 'Task ids this task depends on.'
        }
      },
      additionalProperties: false
    },
    response: {
      201: { description: 'Task created', ...taskResponseSchema }
    }
  },

  getDeliverableTask: {
    tags: ['projects'],
    summary: 'Get task by ID',
    description: 'Returns a single task. code = project code (e.g. ZAZZ), delivId = numeric deliverable id, taskId = numeric task id.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    response: {
      200: { description: 'Task', ...taskResponseSchema }
    }
  },

  updateDeliverableTask: {
    tags: ['projects'],
    summary: 'Update task in deliverable',
    description: 'Full update of task fields (title, status, prompt, agentName, etc.). Send only fields to change. code, delivId, taskId are all numeric/string ids.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' },
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
      }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        agentName: { type: 'string', maxLength: 50 },
        storyPoints: { type: 'integer', minimum: 1, maximum: 21 },
        prompt: { type: 'string', maxLength: 10000 },
        isBlocked: { type: 'boolean' },
        blockedReason: { type: 'string', maxLength: 1000 },
        gitWorktree: { type: 'string', maxLength: 255 }
      },
      additionalProperties: false
    },
    response: {
      200: { description: 'Task updated', ...taskResponseSchema }
    }
  }
};
