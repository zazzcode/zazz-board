/**
 * JSON Schema validation definitions for Task Blaster API
 * Uses Fastify's built-in AJV for maximum performance
 */

// Common parameter schemas
const idParam = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^\\d+$' }
  }
};

const codeParam = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9]+$' } // Project code like PROJ, FEATURE
  }
};

const taskIdParam = {
  type: 'object',
  required: ['taskId'],
  properties: {
    taskId: { type: 'string', pattern: '^\\d+$' }
  }
};

// Tag name validation - enforces lowercase, hyphen rules at API level
const tagNamePattern = '^[a-z0-9]+(-[a-z0-9]+)*$';

// Tag schemas
export const tagSchemas = {
  // GET /tags
  getTags: {
    querystring: {
      type: 'object',
      properties: {
        search: { type: 'string', minLength: 1, maxLength: 100 }
      }
    }
  },
  
  // GET /tags/:id
  getTagById: {
    params: idParam
  },
  
  // POST /tags
  createTag: {
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: tagNamePattern,
          description: 'Tag name must be lowercase with hyphens as separators. Cannot start or end with hyphen.'
        },
        color: {
          type: 'string',
          pattern: '^#[0-9A-Fa-f]{6}$',
          description: 'Color must be a valid hex color (e.g., #FF5733)'
        }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  
  // PUT /tags/:id
  updateTag: {
    params: idParam,
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: tagNamePattern,
          description: 'Tag name must be lowercase with hyphens as separators. Cannot start or end with hyphen.'
        },
        color: {
          type: 'string',
          pattern: '^#[0-9A-Fa-f]{6}$',
          description: 'Color must be a valid hex color (e.g., #FF5733)'
        }
      },
      additionalProperties: false
    }
  },
  
  // DELETE /tags/:id
  deleteTag: {
    params: idParam
  }
};

// Task schemas
export const taskSchemas = {
  // GET /tasks
  getTasks: {
    querystring: {
      type: 'object',
      properties: {
        projectId: { type: 'string', pattern: '^[0-9]+$' },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        agentName: { type: 'string', maxLength: 50 },
        search: { type: 'string', minLength: 1, maxLength: 255 }
      }
    }
  },
  
  // GET /tasks/:id
  getTaskById: {
    params: idParam
  },
  
  // POST /tasks
  createTask: {
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
  
  // PUT /tasks/:id
  updateTask: {
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
  
  // DELETE /tasks/:id
  deleteTask: {
    params: idParam
  },
  
  // PATCH /tasks/:id/reorder
  reorderTask: {
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
  
  // PUT /tasks/:taskId/tags
  setTaskTags: {
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

// Reusable task item shape for graph response schemas
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

// Task Graph / Relation schemas
export const taskGraphSchemas = {
  // GET /projects/:code/graph
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

  // GET /projects/:code/tasks/:taskId/relations
  getTaskRelations: {
    tags: ['task-graph'],
    summary: 'Get all relations for a task',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: { type: 'array', items: graphRelationItem }
    }
  },

  // POST /projects/:code/tasks/:taskId/relations
  createTaskRelation: {
    tags: ['task-graph'],
    summary: 'Create a task relation',
    description: 'Create a DEPENDS_ON or COORDINATES_WITH relation. Cycle detection is enforced for DEPENDS_ON. Returns 400 for cycles/self-refs, 409 for duplicates.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      required: ['relatedTaskId', 'relationType'],
      properties: {
        relatedTaskId: { type: 'integer', minimum: 1 },
        relationType: { type: 'string', enum: ['DEPENDS_ON', 'COORDINATES_WITH'] }
      },
      additionalProperties: false
    }
  },

  // DELETE /projects/:code/tasks/:taskId/relations/:relatedTaskId/:relationType
  deleteTaskRelation: {
    tags: ['task-graph'],
    summary: 'Delete a task relation',
    params: {
      type: 'object',
      required: ['code', 'taskId', 'relatedTaskId', 'relationType'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' },
        relatedTaskId: { type: 'string', pattern: '^\\d+$' },
        relationType: { type: 'string', enum: ['DEPENDS_ON', 'COORDINATES_WITH'] }
      }
    }
  },

  // GET /projects/:code/tasks/:taskId/readiness
  checkTaskReadiness: {
    tags: ['task-graph'],
    summary: 'Check if a task\'s dependencies are met',
    description: 'Returns ready=true when all DEPENDS_ON prerequisites have reached the project\'s completionCriteriaStatus (default DONE). Agents poll this before claiming a task.',
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
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

  // GET /projects/:code/deliverables/:delivId/graph
  getDeliverableGraph: {
    tags: ['task-graph'],
    summary: 'Get task graph scoped to a deliverable',
    description: 'Returns tasks and relations for one deliverable. Cross-deliverable relations are excluded. Primary endpoint for agents monitoring their own work. Polled every 3 s.',
    params: {
      type: 'object',
      required: ['code', 'delivId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' }
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

  // GET /coordination-types
  getCoordinationTypes: {
    tags: ['task-graph'],
    summary: 'List all coordination types'
  },
};

// Project schemas
export const projectSchemas = {
  // GET /projects
  getProjects: {
    querystring: {
      type: 'object',
      properties: {
        leaderId: { type: 'string', pattern: '^[0-9]+$' },
        search: { type: 'string', minLength: 1, maxLength: 255 }
      }
    }
  },
  
  // GET /projects/:id
  getProjectById: {
    params: idParam
  },
  
  // POST /projects
  createProject: {
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        code: { 
          type: 'string', 
          minLength: 2, 
          maxLength: 10,
          pattern: '^[A-Z]+$',
          description: 'Project code must contain only uppercase letters (A-Z), no spaces, numbers, or special characters'
        },
        description: { type: 'string', maxLength: 5000 },
        leaderId: { type: 'integer', minimum: 1 }
      },
      required: ['title', 'code', 'leaderId'],
      additionalProperties: false
    }
  },
  
  // PUT /projects/:id - Project codes are immutable, only title, description, leaderId, and graph settings can be updated
  updateProject: {
    params: idParam,
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        leaderId: { type: 'integer', minimum: 1 },
        completionCriteriaStatus: { type: 'string', maxLength: 25, nullable: true },
        taskGraphLayoutDirection: { type: 'string', enum: ['LR', 'TB'] }
      },
      additionalProperties: false
    }
  },
  
  // DELETE /projects/:id
  deleteProject: {
    params: idParam
  },
  
  // GET /projects/:id/tasks
  getProjectTasks: {
    params: idParam,
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
      }
    }
  },

  // Project code-based task schemas
  // PATCH /projects/:code/tasks/:taskId/status
  updateTaskStatus: {
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { 
          type: 'string',
          pattern: '^[A-Z_]+$'
        }
      }
    }
  },

  // PUT /projects/:code/tasks/:taskId
  updateTask: {
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
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
    }
  },

  // DELETE /projects/:code/tasks/:taskId
  deleteTask: {
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    }
  }
};

export const deliverableSchemas = {
  getProjectDeliverables: {
    params: {
      type: 'object',
      required: ['projectCode'],
      properties: { projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' } }
    },
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] }
      }
    }
  },
  getDeliverableById: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },
  createDeliverable: {
    params: {
      type: 'object',
      required: ['projectCode'],
      properties: { projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' } }
    },
    body: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 30 },
        description: { type: 'string' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] },
        dedFilePath: { type: 'string', maxLength: 500 },
        planFilePath: { type: 'string', maxLength: 500 },
        prdFilePath: { type: 'string', maxLength: 500 },
        gitWorktree: { type: 'string', maxLength: 255 },
        gitBranch: { type: 'string', maxLength: 255 },
        pullRequestUrl: { type: 'string', maxLength: 500 }
      },
      additionalProperties: false
    }
  },
  updateDeliverable: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 30 },
        description: { type: 'string' },
        type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        dedFilePath: { type: 'string', maxLength: 500 },
        planFilePath: { type: 'string', maxLength: 500 },
        prdFilePath: { type: 'string', maxLength: 500 },
        gitWorktree: { type: 'string', maxLength: 255 },
        gitBranch: { type: 'string', maxLength: 255 },
        pullRequestUrl: { type: 'string', maxLength: 500 },
        position: { type: 'integer', minimum: 0 }
      },
      additionalProperties: false
    }
  },
  deleteDeliverable: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },
  updateDeliverableStatus: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', pattern: '^[A-Z_]+$' } },
      additionalProperties: false
    }
  },
  approveDeliverable: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },
  getDeliverableTasks: {
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  }
};

// User schemas
export const userSchemas = {
  // GET /users
  getUsers: {
    querystring: {
      type: 'object',
      properties: {
        search: { type: 'string', minLength: 1, maxLength: 255 }
      }
    }
  },
  
  // GET /users/:id
  getUserById: {
    params: idParam
  },
  
  // POST /users
  createUser: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 100 },
        lastName: { type: 'string', minLength: 1, maxLength: 100 }
      },
      required: ['username', 'email', 'firstName', 'lastName'],
      additionalProperties: false
    }
  },
  
  // PUT /users/:id
  updateUser: {
    params: idParam,
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 100 },
        lastName: { type: 'string', minLength: 1, maxLength: 100 }
      },
      additionalProperties: false
    }
  },
  
  // DELETE /users/:id
  deleteUser: {
    params: idParam
  }
};

// Common response schemas
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

