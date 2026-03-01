import { projectSchemas } from '../schemas/validation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function projectRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all project routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /projects - List all projects with details
  fastify.get('/projects', {
    schema: projectSchemas.getProjects
  }, async (request, reply) => {
    try {
      const projects = await dbService.getProjectsWithDetails();
      reply.send(projects);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // GET /projects/:id - Get specific project
  fastify.get('/projects/:id', {
    schema: projectSchemas.getProjectById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.getProjectById(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project' });
    }
  });

  // POST /projects - Create new project
  fastify.post('/projects', {
    schema: projectSchemas.createProject
  }, async (request, reply) => {
    try {
      const project = await dbService.createProject(request.body);
      reply.code(201).send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  // PUT /projects/:id - Update project
  fastify.put('/projects/:id', {
    schema: projectSchemas.updateProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.updateProject(parseInt(id), request.body);
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update project' });
    }
  });

  // DELETE /projects/:id - Delete project
  fastify.delete('/projects/:id', {
    schema: projectSchemas.deleteProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.deleteProject(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send({ message: 'Project deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to delete project' });
    }
  });

  // GET /projects/:id/tasks - Get tasks for project
  fastify.get('/projects/:id/tasks', {
    schema: projectSchemas.getProjectTasks
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, priority } = request.query;
      const filters = { projectId: parseInt(id), status, priority };
      
      const tasks = await dbService.getTasks(filters);
      reply.send(tasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project tasks' });
    }
  });

  // GET /projects/:id/kanban/tasks/column/:status - Get column positions for a specific status
  fastify.get('/projects/:id/kanban/tasks/column/:status', {
    schema: {
      params: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string', pattern: '^\\d+$' },
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id, status } = request.params;
      const projectId = parseInt(id);
      
      const columnTasks = await dbService.getColumnPositions(projectId, status);
      reply.send(columnTasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch column positions' });
    }
  });

  // PATCH /projects/:code/kanban/tasks/column/:status/positions - Update multiple task positions in a column
  fastify.patch('/projects/:code/kanban/tasks/column/:status/positions', {
    schema: {
      params: {
        type: 'object',
        required: ['code', 'status'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }, // Project code like PROJ, FEATURE
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      },
      body: {
        type: 'object',
        required: ['positionUpdates'],
        properties: {
          positionUpdates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['taskId', 'newPosition'],
              properties: {
                taskId: { type: 'number' },
                newPosition: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, status } = request.params;
      const { positionUpdates } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      const updatedTasks = await dbService.updateColumnPositions(project.id, status, positionUpdates);
      reply.send(updatedTasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update column positions' });
    }
  });

  // PATCH /projects/:code/kanban/tasks/:taskId/position - Update single task position
  fastify.patch('/projects/:code/kanban/tasks/:taskId/position', {
    schema: {
      params: {
        type: 'object',
        required: ['code', 'taskId'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }, // Project code like PROJ, FEATURE
          taskId: { type: 'string', pattern: '^\\d+$' }
        }
      },
      body: {
        type: 'object',
        required: ['newPosition', 'status'],
        properties: {
          newPosition: { type: 'number' },
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const { newPosition, status } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      const taskIdNum = parseInt(taskId);
      const updatedTask = await dbService.updateTaskPosition(taskIdNum, newPosition, status);

      reply.send(updatedTask);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update task position' });
    }
  });

  // PATCH /projects/:code/tasks/:taskId/status - Change task status (project-scoped)
  fastify.patch('/projects/:code/tasks/:taskId/status', {
    schema: projectSchemas.updateTaskStatus
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const { status } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Get tasks in target column to determine position
      const targetColumnTasks = await dbService.getTasks({ 
        projectId: currentTask.projectId, 
        status 
      });
      
      // Calculate new position (at the bottom of the column)
      const newPosition = targetColumnTasks.length > 0 ? 
        Math.max(...targetColumnTasks.map(t => t.position || 0)) + 10 : 10;
      
      // Update task with new status and position — updateTask handles auto-promotion
      const updatedTask = await dbService.updateTask(currentTask.id, {
        ...currentTask,
        status,
        position: newPosition,
        updatedAt: new Date()
      });

      request.log.info(`Task ${taskId} status changed from ${currentTask.status} to ${status}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to change task status');
      reply.code(500).send({ error: 'Failed to change task status' });
    }
  });

  // PUT /projects/:code/tasks/:taskId - Update task (project-scoped)
  fastify.put('/projects/:code/tasks/:taskId', {
    schema: projectSchemas.updateTask
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const taskData = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Update task — updateTask handles auto-promotion on status change
      const updatedTask = await dbService.updateTask(currentTask.id, taskData);

      request.log.info(`Task ${taskId} updated`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to update task');
      reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // DELETE /projects/:code/tasks/:taskId - Delete task (project-scoped)
  fastify.delete('/projects/:code/tasks/:taskId', {
    schema: projectSchemas.deleteTask
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Delete task
      const deletedTask = await dbService.deleteTask(currentTask.id);
      
      request.log.info(`Task ${taskId} deleted`);
      reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      request.log.error(error, 'Failed to delete task');
      reply.code(500).send({ error: 'Failed to delete task' });
    }
  });

  // GET /projects/:code/statuses - Get project's status workflow
  fastify.get('/projects/:code/statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            statusWorkflow: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send({ statusWorkflow: project.statusWorkflow });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project status workflow' });
    }
  });

  // PUT /projects/:code/statuses - Update project's status workflow (leaders only)
  fastify.put('/projects/:code/statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      },
      body: {
        type: 'object',
        required: ['statusWorkflow'],
        properties: {
          statusWorkflow: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      const { statusWorkflow } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Verify user is project leader
      if (project.leaderId !== request.user.id) {
        return reply.code(403).send({ error: 'Only project leaders can update status workflow' });
      }
      
      // Validate all status codes exist in STATUS_DEFINITIONS
      const validStatuses = await dbService.getStatusDefinitions();
      const validStatusCodes = validStatuses.map(s => s.code);
      
      const invalidStatuses = statusWorkflow.filter(status => !validStatusCodes.includes(status));
      if (invalidStatuses.length > 0) {
        return reply.code(400).send({ 
          error: 'Invalid status codes', 
          invalidStatuses 
        });
      }
      
      // Check if any statuses being removed have tasks
      const currentWorkflow = project.statusWorkflow;
      const removedStatuses = currentWorkflow.filter(status => !statusWorkflow.includes(status));
      
      for (const status of removedStatuses) {
        const hasTasks = await dbService.hasTasksWithStatus(project.id, status);
        if (hasTasks) {
          return reply.code(400).send({ 
            error: `Cannot remove status '${status}' because tasks exist with this status` 
          });
        }
      }
      
      // Update the workflow
      const updatedProject = await dbService.updateProjectStatusWorkflow(
        project.id, 
        statusWorkflow, 
        request.user.id
      );
      
      request.log.info(`Project ${code} status workflow updated by user ${request.user.id}`);
      reply.send({ 
        statusWorkflow: updatedProject.status_workflow 
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update project status workflow' });
    }
  });

  // GET /projects/:code/deliverable-statuses - Get project's deliverable status workflow
  fastify.get('/projects/:code/deliverable-statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      const project = await dbService.getProjectByCode(code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      reply.send({ deliverableStatusWorkflow: project.deliverableStatusWorkflow || [] });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project deliverable workflow' });
    }
  });

  // PUT /projects/:code/deliverable-statuses - Update deliverable status workflow (leaders only)
  fastify.put('/projects/:code/deliverable-statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      },
      body: {
        type: 'object',
        required: ['deliverableStatusWorkflow'],
        properties: {
          deliverableStatusWorkflow: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      const { deliverableStatusWorkflow } = request.body;
      const project = await dbService.getProjectByCode(code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (project.leaderId !== request.user.id) {
        return reply.code(403).send({ error: 'Only project leaders can update deliverable workflow' });
      }

      const validStatuses = await dbService.getStatusDefinitions();
      const validStatusCodes = validStatuses.map(s => s.code);
      const invalidStatuses = deliverableStatusWorkflow.filter(status => !validStatusCodes.includes(status));
      if (invalidStatuses.length > 0) {
        return reply.code(400).send({ error: 'Invalid status codes', invalidStatuses });
      }

      const currentWorkflow = project.deliverableStatusWorkflow || [];
      const removedStatuses = currentWorkflow.filter(status => !deliverableStatusWorkflow.includes(status));
      for (const status of removedStatuses) {
        const hasDeliverables = await dbService.hasDeliverablesWithStatus(project.id, status);
        if (hasDeliverables) {
          return reply.code(400).send({ error: `Cannot remove status '${status}' because deliverables exist with this status` });
        }
      }

      const updatedProject = await dbService.updateProjectDeliverableStatusWorkflow(
        project.id,
        deliverableStatusWorkflow,
        request.user.id
      );

      reply.send({ deliverableStatusWorkflow: updatedProject.deliverable_status_workflow });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update deliverable status workflow' });
    }
  });

  // ==================== DELIVERABLE-SCOPED TASK CRUD ====================
  // All task CRUD operations are scoped to a deliverable within a project

  // POST /projects/:code/deliverables/:delivId/tasks - Create task
  fastify.post('/projects/:code/deliverables/:delivId/tasks', {
    schema: projectSchemas.createDeliverableTask
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const deliverableId = parseInt(delivId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Verify deliverable belongs to project
      const deliverable = await dbService.getDeliverableById(deliverableId);
      if (!deliverable || deliverable.projectId !== project.id) {
        return reply.code(404).send({ error: 'Deliverable not found in this project' });
      }

      // Create task
      const taskData = {
        ...request.body,
        projectId: project.id,
        deliverableId,
        status: request.body.status || 'READY',
        priority: request.body.priority || 'MEDIUM',
        position: request.body.position || 10,
        createdBy: request.user.id,
        updatedBy: request.user.id
      };

      const task = await dbService.createTask(taskData);
      reply.code(201).send(task);
    } catch (error) {
      request.log.error(error, 'Failed to create task');
      reply.code(500).send({ error: 'Failed to create task' });
    }
  });

  // GET /projects/:code/deliverables/:delivId/tasks/:taskId - Get single task
  fastify.get('/projects/:code/deliverables/:delivId/tasks/:taskId', {
    schema: projectSchemas.getDeliverableTask
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Get task and verify it belongs to the deliverable and project
      const task = await dbService.getTaskById(taskIdNum);
      if (!task || task.projectId !== project.id || task.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      reply.send(task);
    } catch (error) {
      request.log.error(error, 'Failed to fetch task');
      reply.code(500).send({ error: 'Failed to fetch task' });
    }
  });

  // PUT /projects/:code/deliverables/:delivId/tasks/:taskId - Update task
  fastify.put('/projects/:code/deliverables/:delivId/tasks/:taskId', {
    schema: projectSchemas.updateDeliverableTask
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Get current task and verify it belongs to the deliverable and project
      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      // Update task
      const updatedTask = await dbService.updateTask(taskIdNum, {
        ...currentTask,
        ...request.body
      });

      request.log.info(`Task ${taskId} updated in deliverable ${delivId}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to update task');
      reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // DELETE /projects/:code/deliverables/:delivId/tasks/:taskId - Delete task
  fastify.delete('/projects/:code/deliverables/:delivId/tasks/:taskId', {
    schema: {
      params: {
        type: 'object',
        required: ['code', 'delivId', 'taskId'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' },
          delivId: { type: 'string', pattern: '^\\d+$' },
          taskId: { type: 'string', pattern: '^\\d+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Get current task and verify it belongs to the deliverable and project
      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      // Delete task
      await dbService.deleteTask(taskIdNum);

      request.log.info(`Task ${taskId} deleted from deliverable ${delivId}`);
      reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      request.log.error(error, 'Failed to delete task');
      reply.code(500).send({ error: 'Failed to delete task' });
    }
  });

  // PATCH /projects/:code/deliverables/:delivId/tasks/:taskId/notes - Append a note to a task
  fastify.patch('/projects/:code/deliverables/:delivId/tasks/:taskId/notes', {
    schema: {
      tags: ['projects'],
      summary: 'Append a note to a task',
      description: 'Append-only audit log. Each entry is formatted as "[ISO timestamp] [agent/user]: message". Agents use this to record progress without overwriting earlier entries.',
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
        required: ['note'],
        properties: {
          note: { type: 'string', minLength: 1, maxLength: 5000 },
          agentName: { type: 'string', maxLength: 255 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const { note, agentName } = request.body;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      const author = agentName || request.user.fullName || request.user.email;
      const timestamp = new Date().toISOString();
      const newEntry = `[${timestamp}] [${author}]: ${note}`;
      const updatedNotes = currentTask.notes
        ? `${currentTask.notes}\n${newEntry}`
        : newEntry;

      const updatedTask = await dbService.updateTask(taskIdNum, {
        ...currentTask,
        notes: updatedNotes,
        updatedBy: request.user.id
      });

      request.log.info(`Note appended to task ${taskId} in deliverable ${delivId}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to append note to task');
      reply.code(500).send({ error: 'Failed to append note to task' });
    }
  });

  // PATCH /projects/:code/deliverables/:delivId/tasks/:taskId/status - Change task status
  fastify.patch('/projects/:code/deliverables/:delivId/tasks/:taskId/status', {
    schema: {
      tags: ['projects'],
      summary: 'Change task status (agent claim)',
      description: 'Change task status. Include agentName to claim the task: { status: "IN_PROGRESS", agentName: "worker-1" }. Returns 409 if task is cancelled.',
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
        required: ['status'],
        properties: {
          status: { type: 'string', pattern: '^[A-Z_]+$' },
          agentName: { type: 'string', maxLength: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const { status, agentName } = request.body;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Validate status exists
      const statusDef = await dbService.getStatusDefinitionByCode(status);
      if (!statusDef) {
        return reply.code(400).send({ error: `Invalid status: ${status}` });
      }

      // Get current task and verify it belongs to the deliverable and project
      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      // Cancelled tasks are immutable
      if (currentTask.isCancelled) {
        return reply.code(409).send({ error: 'Cannot change status of a cancelled task' });
      }

      // Get tasks in target column to determine position
      const targetColumnTasks = await dbService.getTasks({
        projectId: project.id,
        status
      });

      const newPosition = targetColumnTasks.length > 0 ?
        Math.max(...targetColumnTasks.map(t => t.position || 0)) + 10 : 10;

      // Update task — agent claims by setting agentName alongside status
      const updatedTask = await dbService.updateTask(taskIdNum, {
        ...currentTask,
        status,
        position: newPosition,
        ...(agentName !== undefined && { agentName }),
        updatedAt: new Date()
      });

      request.log.info(`Task ${taskId} status changed from ${currentTask.status} to ${status}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to change task status');
      reply.code(500).send({ error: 'Failed to change task status' });
    }
  });

  // PATCH /projects/:code/deliverables/:delivId/tasks/:taskId/cancel - Cancel a task (irreversible)
  fastify.patch('/projects/:code/deliverables/:delivId/tasks/:taskId/cancel', {
    schema: {
      tags: ['projects'],
      summary: 'Cancel a task (irreversible)',
      description: 'Sets is_cancelled=true and forces status to COMPLETED. Cannot be undone. Dependents are still eligible for promotion. Returns 409 if already cancelled.',
      params: {
        type: 'object',
        required: ['code', 'delivId', 'taskId'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' },
          delivId: { type: 'string', pattern: '^\\d+$' },
          taskId: { type: 'string', pattern: '^\\d+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      if (currentTask.isCancelled) {
        return reply.code(409).send({ error: 'Task is already cancelled' });
      }

      const updatedTask = await dbService.updateTask(taskIdNum, {
        isCancelled: true,
        updatedBy: request.user.id
      });

      request.log.info(`Task ${taskId} cancelled in deliverable ${delivId}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to cancel task');
      reply.code(500).send({ error: 'Failed to cancel task' });
    }
  });

  // PATCH /projects/:code/deliverables/:delivId/tasks/:taskId/reorder - Reorder task position
  fastify.patch('/projects/:code/deliverables/:delivId/tasks/:taskId/reorder', {
    schema: {
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
        required: ['position'],
        properties: {
          position: { type: 'integer', minimum: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const { position } = request.body;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Get current task and verify it belongs to the deliverable and project
      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      // Reorder task
      const updatedTask = await dbService.reorderTask(taskIdNum, position);

      request.log.info(`Task ${taskId} reordered to position ${position}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to reorder task');
      reply.code(500).send({ error: 'Failed to reorder task' });
    }
  });

  // PUT /projects/:code/deliverables/:delivId/tasks/:taskId/tags - Set task tags
  fastify.put('/projects/:code/deliverables/:delivId/tasks/:taskId/tags', {
    schema: {
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
        required: ['tagIds'],
        properties: {
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, delivId, taskId } = request.params;
      const { tagIds } = request.body;
      const deliverableId = parseInt(delivId);
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Get current task and verify it belongs to the deliverable and project
      const currentTask = await dbService.getTaskById(taskIdNum);
      if (!currentTask || currentTask.projectId !== project.id || currentTask.deliverableId !== deliverableId) {
        return reply.code(404).send({ error: 'Task not found in this deliverable' });
      }

      // Set task tags
      await dbService.setTaskTags(taskIdNum, tagIds);
      const updatedTags = await dbService.getTagsForTask(taskIdNum);

      request.log.info(`Task ${taskId} tags updated`);
      reply.send({ message: 'Task tags updated successfully', tags: updatedTags });
    } catch (error) {
      request.log.error(error, 'Failed to update task tags');
      reply.code(500).send({ error: 'Failed to update task tags' });
    }
  });
}
