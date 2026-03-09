/**
 * File lock route schemas.
 */

const lockItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Lock row id.' },
    projectId: { type: 'integer', description: 'Project id.' },
    deliverableId: { type: 'integer', description: 'Deliverable id.' },
    taskId: { type: 'integer', description: 'Task id that owns the lock.' },
    phaseStep: { type: 'string', nullable: true, description: 'Plan step label (e.g. "2.3").' },
    agentName: { type: 'string', description: 'Worker/sub-agent name that owns the lock.' },
    fileRelativePath: { type: 'string', description: 'Path relative to the worktree root.' },
    acquiredAt: { type: 'string', format: 'date-time' },
    heartbeatAt: { type: 'string', format: 'date-time' },
    leaseExpiresAt: { type: 'string', format: 'date-time' },
    createdBy: { type: 'integer', nullable: true },
    updatedBy: { type: 'integer', nullable: true },
    updatedAt: { type: 'string', format: 'date-time' },
  }
};

const lockConflictSchema = {
  type: 'object',
  properties: {
    fileRelativePath: { type: 'string' },
    taskId: { type: 'integer' },
    phaseStep: { type: 'string', nullable: true },
    agentName: { type: 'string' },
    leaseExpiresAt: { type: 'string', format: 'date-time' },
  }
};

const deliverableScopeParams = {
  type: 'object',
  required: ['code', 'delivId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
    delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' },
  }
};

const acquireLikeBodyBase = {
  type: 'object',
  required: ['taskId', 'agentName', 'fileRelativePaths'],
  properties: {
    taskId: { type: 'integer', minimum: 1, description: 'Numeric task id that will own locks.' },
    phaseStep: { type: 'string', minLength: 1, maxLength: 20, description: 'Plan step ID (e.g. "3.2").' },
    agentName: { type: 'string', minLength: 1, maxLength: 100, description: 'Worker/sub-agent identifier.' },
    fileRelativePaths: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1, maxLength: 1000 },
      description: 'Paths relative to the worktree root to lock.'
    },
    ttlSeconds: {
      type: 'integer',
      minimum: 5,
      maximum: 300,
      description: 'Lease TTL in seconds. Default 30.'
    }
  },
  additionalProperties: false
};

const heartbeatBody = {
  type: 'object',
  required: ['taskId', 'agentName'],
  properties: {
    taskId: { type: 'integer', minimum: 1, description: 'Numeric task id that owns locks.' },
    agentName: { type: 'string', minLength: 1, maxLength: 100, description: 'Worker/sub-agent identifier.' },
    fileRelativePaths: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 1000 },
      description: 'Optional subset of worktree-relative paths. If omitted, refreshes all lock rows for taskId+agentName in this deliverable.'
    },
    ttlSeconds: {
      type: 'integer',
      minimum: 5,
      maximum: 300,
      description: 'Lease TTL in seconds. Default 30.'
    }
  },
  additionalProperties: false
};

export const fileLockSchemas = {
  listLocks: {
    tags: ['file-locks'],
    summary: 'List active file locks',
    description: 'Returns active file lock leases for a deliverable. Expired locks are reclaimed before response.',
    params: deliverableScopeParams,
    response: {
      200: {
        type: 'object',
        properties: {
          deliverableId: { type: 'integer' },
          projectCode: { type: 'string' },
          lockCount: { type: 'integer' },
          locks: { type: 'array', items: lockItemSchema },
        }
      }
    }
  },

  acquireLocks: {
    tags: ['file-locks'],
    summary: 'Acquire file locks (atomic batch)',
    description: 'Attempts to acquire all requested file locks as one batch. Returns 409 FILE_LOCK_CONFLICT when any file is owned by another task/agent. Workers should poll every 3 seconds and retry on conflict.',
    params: deliverableScopeParams,
    body: acquireLikeBodyBase,
    response: {
      200: {
        type: 'object',
        properties: {
          acquired: { type: 'boolean' },
          ttlSeconds: { type: 'integer' },
          locks: { type: 'array', items: lockItemSchema },
        }
      },
      409: {
        type: 'object',
        properties: {
          error: { type: 'string', enum: ['FILE_LOCK_CONFLICT'] },
          message: { type: 'string' },
          pollIntervalSeconds: { type: 'integer' },
          conflicts: { type: 'array', items: lockConflictSchema },
        }
      }
    }
  },

  heartbeatLocks: {
    tags: ['file-locks'],
    summary: 'Refresh lock lease heartbeat',
    description: 'Extends lease expiry for lock rows owned by taskId+agentName. If fileRelativePaths omitted, refreshes all locks for that owner in the deliverable.',
    params: deliverableScopeParams,
    body: heartbeatBody,
    response: {
      200: {
        type: 'object',
        properties: {
          refreshedCount: { type: 'integer' },
          ttlSeconds: { type: 'integer' },
          locks: { type: 'array', items: lockItemSchema },
        }
      }
    }
  },

  releaseLocks: {
    tags: ['file-locks'],
    summary: 'Release file locks',
    description: 'Releases lock rows for taskId+agentName. If fileRelativePaths omitted, releases all locks owned by that owner in the deliverable.',
    params: deliverableScopeParams,
    body: {
      type: 'object',
      required: ['taskId', 'agentName'],
      properties: {
        taskId: { type: 'integer', minimum: 1, description: 'Numeric task id that owns locks.' },
        agentName: { type: 'string', minLength: 1, maxLength: 100, description: 'Worker/sub-agent identifier.' },
        fileRelativePaths: {
          type: 'array',
          items: { type: 'string', minLength: 1, maxLength: 1000 },
          description: 'Optional subset of worktree-relative paths to release.'
        }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          releasedCount: { type: 'integer' },
          locks: { type: 'array', items: lockItemSchema },
        }
      }
    }
  }
};
