/**
 * Shared parameter schemas and response shapes for Zazz Board API.
 * Used across domain schema files.
 */

export const idParam = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^\\d+$', description: 'Numeric id.' }
  }
};

export const codeParam = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ). Uppercase letters and numbers.' }
  }
};

export const taskIdParam = {
  type: 'object',
  required: ['taskId'],
  properties: {
    taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
  }
};

export const taskResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', description: 'Numeric task id. Use for API paths.' },
    projectId: { type: 'number', description: 'Project id.' },
    deliverableId: { type: 'number', description: 'Deliverable id.' },
    title: { type: 'string', description: 'Task title.' },
    status: { type: 'string', enum: ['TO_DO', 'READY', 'IN_PROGRESS', 'QA', 'COMPLETED'], description: 'Current workflow status.' },
    position: { type: 'number', description: 'Sort order in column.' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    storyPoints: { type: 'number', nullable: true },
    assigneeId: { type: 'number', nullable: true },
    prompt: { type: 'string', nullable: true, description: 'Goal, instructions, acceptance criteria for agent.' },
    isBlocked: { type: 'boolean', nullable: true },
    blockedReason: { type: 'string', nullable: true },
    gitWorktree: { type: 'string', nullable: true, description: 'Git worktree for implementation.' },
    notes: { type: 'string', nullable: true, description: 'Append-only progress log.' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const deliverableResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', description: 'Numeric primary key. Use this for API paths (e.g. create task, update deliverable).' },
    projectId: { type: 'number' },
    deliverableId: { type: 'string', description: 'Human-readable ID (e.g. ZAZZ-4). Use for display; use id for API calls.' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] },
    status: { type: 'string' },
    dedFilePath: { type: 'string', nullable: true, description: 'Relative path or URL to the deliverable specification (SPEC) document.' },
    planFilePath: { type: 'string', nullable: true, description: 'Relative path or URL to the implementation plan (PLAN) document.' },
    prdFilePath: { type: 'string', nullable: true, description: 'Relative path or URL to the PRD document.' },
    gitWorktree: { type: 'string', nullable: true, description: 'Git worktree name used for implementation (e.g. feature-auth).' },
    gitBranch: { type: 'string', nullable: true, description: 'Git branch name for the deliverable work (e.g. feature-auth).' },
    pullRequestUrl: { type: 'string', nullable: true },
    approvedBy: { type: 'number', nullable: true },
    approvedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const tagNamePattern = '^[a-z0-9]+(-[a-z0-9]+)*$';

export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    error: { type: 'string', example: 'Bad Request' },
    message: { type: 'string', example: 'Invalid request parameters' }
  }
};

export const responseSchemas = {
  error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'integer' }
    }
  },
  success: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'object' }
    }
  }
};
