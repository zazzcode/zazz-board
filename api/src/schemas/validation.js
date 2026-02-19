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

// Reusable response shapes for OpenAPI (defined early, used in projectSchemas and deliverableSchemas)
const taskResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', description: 'Task ID' },
    projectId: { type: 'number' },
    deliverableId: { type: 'number' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['TO_DO', 'READY', 'IN_PROGRESS', 'QA', 'COMPLETED'] },
    position: { type: 'number' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    storyPoints: { type: 'number', nullable: true },
    assigneeId: { type: 'number', nullable: true },
    prompt: { type: 'string', nullable: true },
    isBlocked: { type: 'boolean', nullable: true },
    blockedReason: { type: 'string', nullable: true },
    gitWorktree: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const deliverableResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    projectId: { type: 'number' },
    deliverableId: { type: 'string', description: 'Unique deliverable ID e.g. PROJ-1' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    type: { type: 'string', enum: ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION'] },
    status: { type: 'string' },
    dedFilePath: { type: 'string', nullable: true, description: 'Path or URL to DED document' },
    planFilePath: { type: 'string', nullable: true, description: 'Path or URL to implementation plan' },
    prdFilePath: { type: 'string', nullable: true, description: 'Path or URL to PRD document' },
    gitWorktree: { type: 'string', nullable: true },
    gitBranch: { type: 'string', nullable: true },
    pullRequestUrl: { type: 'string', nullable: true },
    approvedBy: { type: 'number', nullable: true },
    approvedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
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
        assigneeId: { type: 'string', pattern: '^[0-9]+$' },
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
        status: { type: 'string', pattern: '^[A-Z_]+$', default: 'TO_DO' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        assigneeId: { type: 'integer', minimum: 1, nullable: true },
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
        assigneeId: { type: 'integer', minimum: 1, nullable: true },
        deliverableId: { type: 'integer', minimum: 1 },
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

// Task Graph / Relation schemas
export const taskGraphSchemas = {
  // GET /projects/:code/graph
  getProjectGraph: {
    params: codeParam
  },

  // GET /projects/:code/tasks/:taskId/relations
  getTaskRelations: {
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },

  // POST /projects/:code/tasks/:taskId/relations
  createTaskRelation: {
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
    params: {
      type: 'object',
      required: ['code', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    }
  },

  // GET /coordination-types
  getCoordinationTypes: {},
};

// Project schemas
export const projectSchemas = {
  // GET /projects
  getProjects: {
    tags: ['projects'],
    summary: 'List projects',
    description: 'Returns all projects. Use for project discovery.',
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
    tags: ['projects'],
    summary: 'Update task status',
    description: 'Pick up task (TO_DO→IN_PROGRESS), complete (IN_PROGRESS→COMPLETED), or move to QA. Use project code (e.g. ZAZZ).',
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
    },
    response: {
      200: { description: 'Task status updated', ...taskResponseSchema }
    }
  },

  // PUT /projects/:code/tasks/:taskId
  updateTask: {
    tags: ['projects'],
    summary: 'Update task',
    description: 'Update task title, status, assignee, prompt, etc. Use project code (e.g. ZAZZ).',
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
        assigneeId: { type: 'number', nullable: true },
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
  },

  // Deliverable-scoped task CRUD (POST/GET/PUT/PATCH/DELETE under /projects/:code/deliverables/:delivId/tasks)
  createDeliverableTask: {
    tags: ['projects'],
    summary: 'Create task in deliverable',
    description: 'Creates a task within a deliverable. Include prompt with goal, instructions, AC. Use project code (e.g. ZAZZ).',
    params: {
      type: 'object',
      required: ['code', 'delivId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        assigneeId: { type: 'integer', minimum: 1 },
        storyPoints: { type: 'integer', minimum: 1, maximum: 21 },
        position: { type: 'integer', minimum: 0 },
        prompt: { type: 'string', maxLength: 10000 },
        gitWorktree: { type: 'string', maxLength: 255 }
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
    description: 'Returns a single task. Use project code and deliverable id.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: { description: 'Task', ...taskResponseSchema }
    }
  },
  updateDeliverableTask: {
    tags: ['projects'],
    summary: 'Update task in deliverable',
    description: 'Full update of task. Use project code and deliverable id.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'taskId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' },
        taskId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 5000 },
        status: { type: 'string', pattern: '^[A-Z_]+$' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        assigneeId: { type: 'integer', minimum: 1 },
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

export const deliverableSchemas = {
  getProjectDeliverables: {
    tags: ['deliverables'],
    summary: 'List deliverables for a project',
    description: 'Returns deliverables for project. Use projectCode (e.g. ZAZZ). Filter by status or type.',
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
    description: 'Returns deliverable with dedFilePath, planFilePath, prdFilePath for document retrieval. Use projectCode (e.g. ZAZZ) and numeric deliverable id.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: { description: 'Deliverable', ...deliverableResponseSchema }
    }
  },
  createDeliverable: {
    tags: ['deliverables'],
    summary: 'Create deliverable',
    description: 'Creates a deliverable in the project. Include dedFilePath, planFilePath for document links.',
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
    },
    response: {
      201: { description: 'Deliverable created', ...deliverableResponseSchema }
    }
  },
  updateDeliverable: {
    tags: ['deliverables'],
    summary: 'Update deliverable',
    description: 'Updates deliverable including dedFilePath, planFilePath, prdFilePath for document paths.',
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
    },
    response: {
      200: { description: 'Deliverable updated', ...deliverableResponseSchema }
    }
  },
  deleteDeliverable: {
    tags: ['deliverables'],
    summary: 'Delete deliverable',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
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
    description: 'Set deliverable status e.g. IN_REVIEW when PR is ready.',
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
    },
    response: {
      200: { description: 'Deliverable status updated', ...deliverableResponseSchema }
    }
  },
  approveDeliverable: {
    tags: ['deliverables'],
    summary: 'Approve deliverable plan',
    description: 'Approves the deliverable plan. Required before tasks can be created.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: { description: 'Deliverable approved', ...deliverableResponseSchema }
    }
  },
  getDeliverableTasks: {
    tags: ['deliverables'],
    summary: 'List tasks for deliverable',
    description: 'Returns tasks in a deliverable. Use to check task completion status.',
    params: {
      type: 'object',
      required: ['projectCode', 'id'],
      properties: {
        projectCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        id: { type: 'string', pattern: '^\\d+$' }
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

// User schemas
export const userSchemas = {
  // GET /users/me
  getCurrentUser: {
    tags: ['users'],
    summary: 'Get authenticated user',
    description: 'Returns the current user based on TB_TOKEN or Bearer token.',
    response: {
      200: {
        description: 'Current user',
        type: 'object',
        properties: {
          id: { type: 'number' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
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

// Standard error response for OpenAPI (reference in route response schemas)
export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    error: { type: 'string', example: 'Bad Request' },
    message: { type: 'string', example: 'Invalid request parameters' }
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

// Core routes (public, no auth)
export const coreSchemas = {
  getHealth: {
    tags: ['core'],
    summary: 'Health check',
    description: 'Returns API health and token cache stats. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'API is healthy',
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          auth: {
            type: 'object',
            properties: {
              tokenCacheInitialized: { type: 'boolean' },
              userCount: { type: 'number' }
            }
          }
        }
      }
    }
  },
  getRoot: {
    tags: ['core'],
    summary: 'API info',
    description: 'Returns API message and endpoint list. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'API info',
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          endpoints: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  getDbTest: {
    tags: ['core'],
    summary: 'Database connectivity test',
    description: 'Tests database connection. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'Database connected',
        type: 'object',
        properties: {
          status: { type: 'string' },
          result: {}
        }
      },
      500: {
        description: 'Database connection failed',
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' }
        }
      }
    }
  },
  getTokenInfo: {
    tags: ['core'],
    summary: 'Token cache debug',
    description: 'Returns token cache stats for debugging. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'Token cache info',
        type: 'object',
        properties: {
          cacheInitialized: { type: 'boolean' },
          userCount: { type: 'number' },
          hasTokens: { type: 'boolean' }
        }
      }
    }
  }
};

// Image routes
export const imageSchemas = {
  getTaskImages: {
    tags: ['images'],
    summary: 'Get all images for a task',
    description: 'Returns metadata for images attached to a task.',
    params: {
      type: 'object',
      required: ['taskId'],
      properties: { taskId: { type: 'string', pattern: '^\\d+$' } }
    },
    response: {
      200: {
        description: 'List of image metadata',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            taskId: { type: 'number' },
            originalName: { type: 'string' },
            contentType: { type: 'string' },
            fileSize: { type: 'number' }
          }
        }
      }
    }
  },
  uploadTaskImages: {
    tags: ['images'],
    summary: 'Upload images to a task',
    description: 'Upload one or more images as base64. Each image needs originalName, contentType, fileSize, base64Data.',
    params: {
      type: 'object',
      required: ['taskId'],
      properties: { taskId: { type: 'string', pattern: '^\\d+$' } }
    },
    body: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            required: ['originalName', 'contentType', 'fileSize', 'base64Data'],
            properties: {
              originalName: { type: 'string' },
              contentType: { type: 'string', pattern: '^image/' },
              fileSize: { type: 'integer', minimum: 1 },
              base64Data: { type: 'string' }
            }
          }
        }
      }
    },
    response: {
      201: {
        description: 'Images uploaded',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          images: { type: 'array', items: { type: 'object' } },
          count: { type: 'number' }
        }
      }
    }
  },
  getImageById: {
    tags: ['images'],
    summary: 'Serve individual image (binary)',
    description: 'Returns image binary data. Use Content-Type header for format.',
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', pattern: '^\\d+$' } }
    },
    response: {
      200: { description: 'Image binary' },
      404: { description: 'Image not found' }
    }
  },
  getImageMetadata: {
    tags: ['images'],
    summary: 'Get image metadata only',
    description: 'Returns image metadata without binary data.',
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', pattern: '^\\d+$' } }
    },
    response: {
      200: {
        description: 'Image metadata',
        type: 'object',
        properties: {
          id: { type: 'number' },
          taskId: { type: 'number' },
          originalName: { type: 'string' },
          contentType: { type: 'string' },
          fileSize: { type: 'number' }
        }
      },
      404: { description: 'Image not found' }
    }
  },
  deleteTaskImage: {
    tags: ['images'],
    summary: 'Delete image from task',
    description: 'Deletes an image. Verifies image belongs to the specified task.',
    params: {
      type: 'object',
      required: ['taskId', 'imageId'],
      properties: {
        taskId: { type: 'string', pattern: '^\\d+$' },
        imageId: { type: 'string', pattern: '^\\d+$' }
      }
    },
    response: {
      200: {
        description: 'Image deleted',
        type: 'object',
        properties: {
          message: { type: 'string' },
          image: { type: 'object' }
        }
      },
      403: { description: 'Image does not belong to the specified task' },
      404: { description: 'Image not found' }
    }
  }
};

