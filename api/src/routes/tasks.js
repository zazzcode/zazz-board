import { taskSchemas } from '../schemas/validation.js';
import { applyGitStatus } from '../services/gitStatus.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function taskRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all task routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /tasks - List all tasks with filters
  fastify.get('/tasks', {
    schema: taskSchemas.getTasks
  }, async (request, reply) => {
    try {
      request.log.info('Processing tasks request with filters');
      
      const { projectId, status, priority, assigneeId, search } = request.query;
      const filters = {
        projectId: projectId ? parseInt(projectId) : undefined,
        status,
        priority,
        assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
        search
      };
      
      const tasks = await dbService.getTasks(filters);
      request.log.info(`Retrieved ${tasks.length} tasks`);
      reply.send(tasks);
    } catch (error) {
      request.log.error(error, 'Failed to fetch tasks');
      reply.code(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // GET /tasks/:id - Get specific task
  fastify.get('/tasks/:id', {
    schema: taskSchemas.getTaskById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await dbService.getTaskById(parseInt(id));
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch task' });
    }
  });

  // POST /tasks - Create new task
  fastify.post('/tasks', {
    schema: taskSchemas.createTask
  }, async (request, reply) => {
    try {
      const taskData = applyGitStatus(request.body);
      const task = await dbService.createTask(taskData);
      reply.code(201).send(task);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to create task' });
    }
  });

  // PUT /tasks/:id - Update task
  fastify.put('/tasks/:id', {
    schema: taskSchemas.updateTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Get current task to check current status for Git transitions
      const currentTask = await dbService.getTaskById(parseInt(id));
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Apply Git status transitions with current task state
      const taskDataWithCurrentStatus = { ...request.body, status: currentTask.status };
      const taskData = applyGitStatus(taskDataWithCurrentStatus);
      
      const task = await dbService.updateTask(parseInt(id), taskData);
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // PATCH /tasks/:id/status - Change task status
  fastify.patch('/tasks/:id/status', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string', 
            enum: ['TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE'] 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      
      // Get current task
      const currentTask = await dbService.getTaskById(parseInt(id));
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Get tasks in target column to determine position
      const targetColumnTasks = await dbService.getTasks({ 
        projectId: currentTask.projectId, 
        status 
      });
      
      // Calculate new position (at the bottom of the column)
      const newPosition = targetColumnTasks.length > 0 ? 
        Math.max(...targetColumnTasks.map(t => t.position || 0)) + 10 : 10;
      
      // Update task with new status and position
      const updatedTask = await dbService.updateTask(parseInt(id), {
        ...currentTask,
        status,
        position: newPosition,
        updatedAt: new Date()
      });
      
      request.log.info(`Task ${id} status changed from ${currentTask.status} to ${status}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to change task status');
      reply.code(500).send({ error: 'Failed to change task status' });
    }
  });

  // DELETE /tasks/:id - Delete task
  fastify.delete('/tasks/:id', {
    schema: taskSchemas.deleteTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await dbService.deleteTask(parseInt(id));
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to delete task' });
    }
  });





  // PATCH /tasks/:id/reorder - Reorder task position
  fastify.patch('/tasks/:id/reorder', {
    schema: taskSchemas.reorderTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { position } = request.body;
      
      const task = await dbService.reorderTask(parseInt(id), position);
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to reorder task' });
    }
  });

  // PUT /tasks/:taskId/tags - Set task tags
  fastify.put('/tasks/:taskId/tags', {
    schema: taskSchemas.setTaskTags
  }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const { tagIds } = request.body;
      
      await dbService.setTaskTags(parseInt(taskId), tagIds);
      const updatedTags = await dbService.getTagsForTask(parseInt(taskId));
      
      reply.send({ message: 'Task tags updated successfully', tags: updatedTags });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update task tags' });
    }
  });
}
