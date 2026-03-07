/**
 * Deliverable route schemas.
 */

import { taskResponseSchema, deliverableResponseSchema } from './common.js';

export const deliverableSchemas = {
  getProjectDeliverables: {
    tags: ['deliverables'],
    summary: 'List deliverables',
    description: 'Returns deliverables for a project. Filter by status (e.g. IN_PROGRESS) or type (e.g. FEATURE) via query params.',
    params: {
      type: 'object',
      required: ['projectCode'],
      properties: { projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' } }
    },
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', pattern: '^[A-Z_]+$', description: 'Filter by deliverable status.' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'], description: 'Filter by deliverable type.' }
      }
    },
    response: {
      200: {
        description: 'List of deliverables',
        type: 'array',
        items: deliverableResponseSchema
      }
    }
  },

  getDeliverableById: {
    tags: ['deliverables'],
    summary: 'Get deliverable by ID',
    description: 'Returns deliverable with dedFilePath (SPEC), planFilePath (PLAN), prdFilePath for document retrieval.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        id: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
      }
    },
    response: {
      200: { description: 'Deliverable', ...deliverableResponseSchema }
    }
  },

  createDeliverable: {
    tags: ['deliverables'],
    summary: 'Create deliverable',
    description: 'Creates a new deliverable card in the project. Use this when starting work on a new feature, bug fix, or other work item. The response includes id (numeric—use for create task and other API paths) and deliverableId (string, e.g. ZAZZ-4—use for display). You can include dedFilePath and planFilePath on create if known, or add them later via update deliverable.',
    params: {
      type: 'object',
      required: ['projectCode'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ). Uppercase letters and numbers.' }
      }
    },
    body: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 30, description: 'Short name for the deliverable (e.g. "User Auth").' },
        description: { type: 'string', description: 'Optional longer description.' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'], description: 'Type of work.' },
        dedFilePath: { type: 'string', maxLength: 500, description: 'Relative path to the SPEC document (e.g. .zazz/deliverables/user-auth-SPEC.md). Add when SPEC exists.' },
        planFilePath: { type: 'string', maxLength: 500, description: 'Relative path to the PLAN document (e.g. .zazz/deliverables/user-auth-PLAN.md). Add when PLAN exists.' },
        prdFilePath: { type: 'string', maxLength: 500, description: 'Relative path to the PRD document.' },
        gitWorktree: { type: 'string', maxLength: 255, description: 'Git worktree name for implementation (e.g. feature-auth). Add when work begins.' },
        gitBranch: { type: 'string', maxLength: 255, description: 'Git branch name (e.g. feature-auth). Add when work begins.' },
        pullRequestUrl: { type: 'string', maxLength: 500, description: 'URL to the PR when ready for review.' }
      },
      additionalProperties: false
    },
    response: {
      201: { description: 'Deliverable created. Use id for create task and update paths; deliverableId for display.', ...deliverableResponseSchema }
    }
  },

  updateDeliverable: {
    tags: ['deliverables'],
    summary: 'Update deliverable',
    description: 'Updates deliverable metadata. Use this to add or change: dedFilePath (after SPEC is written), planFilePath (after PLAN is approved), gitWorktree and gitBranch (when work begins), pullRequestUrl (when PR is opened). Send only the fields you are updating. id is the numeric id from create deliverable or list deliverables.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        id: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id from create or list.' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 30 },
        description: { type: 'string' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] },
        status: { type: 'string', pattern: '^[A-Z_]+$', description: 'Deliverable status (e.g. PLANNING, IN_PROGRESS, IN_REVIEW, STAGED, DONE). Use update deliverable status for status-only changes.' },
        dedFilePath: { type: 'string', maxLength: 500, description: 'Relative path to SPEC (e.g. .zazz/deliverables/user-auth-SPEC.md). Set when SPEC is created.' },
        planFilePath: { type: 'string', maxLength: 500, description: 'Relative path to PLAN (e.g. .zazz/deliverables/user-auth-PLAN.md). Set when PLAN is approved.' },
        prdFilePath: { type: 'string', maxLength: 500, description: 'Relative path to PRD.' },
        gitWorktree: { type: 'string', maxLength: 255, description: 'Git worktree name (e.g. feature-auth). Set when implementation begins.' },
        gitBranch: { type: 'string', maxLength: 255, description: 'Git branch name. Set when implementation begins.' },
        pullRequestUrl: { type: 'string', maxLength: 500, description: 'PR URL when ready for review.' },
        position: { type: 'integer', minimum: 0, description: 'Sort order in deliverable list.' }
      },
      additionalProperties: false
    },
    response: {
      200: { description: 'Deliverable updated', ...deliverableResponseSchema }
    }
  },

  deleteDeliverable: {
    tags: ['deliverables'],
    summary: 'Delete deliverable',
    description: 'Deletes a deliverable by numeric id. Cascades to tasks. Use projectCode (e.g. ZAZZ) and numeric id.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: { description: 'Deliverable deleted' }
    }
  },

  updateDeliverableStatus: {
    tags: ['deliverables'],
    summary: 'Update deliverable status',
    description: 'Changes the deliverable status in the workflow. Use to move a deliverable through stages: PLANNING → IN_PROGRESS (when work begins) → IN_REVIEW (when PR is ready) → STAGED → DONE. Valid statuses come from the project\'s deliverable workflow. Use GET /projects/{code}/deliverable-statuses to see allowed values.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        id: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', pattern: '^[A-Z_]+$' } },
      additionalProperties: false
    },
    response: {
      200: { description: 'Deliverable status updated', ...deliverableResponseSchema }
    }
  },

  approveDeliverable: {
    tags: ['deliverables'],
    summary: 'Approve deliverable plan',
    description: 'Approves the deliverable plan. Required before tasks can be created. Use after PLAN is finalized.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        id: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
      }
    },
    response: {
      200: { description: 'Deliverable approved', ...deliverableResponseSchema }
    }
  },

  getDeliverableTasks: {
    tags: ['deliverables'],
    summary: 'List tasks for deliverable',
    description: 'Returns all tasks in a deliverable. Use to check task completion status or list tasks for a deliverable.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
        id: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
      }
    },
    response: {
      200: {
        description: 'List of tasks',
        type: 'array',
        items: taskResponseSchema
      }
    }
  }
};
