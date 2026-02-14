import { taskGraphSchemas } from '../schemas/validation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function taskGraphRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all task graph routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /projects/:code/graph - Get full task graph for a project
  fastify.get('/projects/:code/graph', {
    schema: taskGraphSchemas.getProjectGraph
  }, async (request, reply) => {
    try {
      const { code } = request.params;

      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const graph = await dbService.getProjectTaskGraph(project.id);
      reply.send({
        projectId: project.id,
        projectCode: project.code,
        taskGraphLayoutDirection: project.taskGraphLayoutDirection,
        completionCriteriaStatus: project.completionCriteriaStatus,
        ...graph
      });
    } catch (error) {
      request.log.error(error, 'Failed to fetch project task graph');
      reply.code(500).send({ error: 'Failed to fetch project task graph' });
    }
  });

  // GET /tasks/:id/relations - Get all relations for a task
  fastify.get('/tasks/:id/relations', {
    schema: taskGraphSchemas.getTaskRelations
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const taskId = parseInt(id);

      const task = await dbService.getTaskById(taskId);
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      const relations = await dbService.getTaskRelations(taskId);
      reply.send(relations);
    } catch (error) {
      request.log.error(error, 'Failed to fetch task relations');
      reply.code(500).send({ error: 'Failed to fetch task relations' });
    }
  });

  // POST /tasks/:id/relations - Create a task relation
  fastify.post('/tasks/:id/relations', {
    schema: taskGraphSchemas.createTaskRelation
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { relatedTaskId, relationType } = request.body;
      const taskId = parseInt(id);

      const relations = await dbService.createTaskRelation(
        taskId,
        relatedTaskId,
        relationType,
        request.user.id
      );

      request.log.info(`Created ${relationType} relation: task ${taskId} -> ${relatedTaskId}`);
      reply.code(201).send(relations);
    } catch (error) {
      // Return 400 for business logic errors (self-ref, cycle, cross-project, not found)
      if (error.message.includes('cannot relate to itself') ||
          error.message.includes('circular reference') ||
          error.message.includes('same project') ||
          error.message.includes('not found')) {
        return reply.code(400).send({ error: error.message });
      }
      // Return 409 for duplicate relation
      if (error.isDuplicate || error.code === '23505') {
        return reply.code(409).send({ error: 'This relation already exists' });
      }
      request.log.error(error, 'Failed to create task relation');
      reply.code(500).send({ error: 'Failed to create task relation' });
    }
  });

  // DELETE /tasks/:id/relations/:relatedTaskId/:relationType - Delete a task relation
  fastify.delete('/tasks/:id/relations/:relatedTaskId/:relationType', {
    schema: taskGraphSchemas.deleteTaskRelation
  }, async (request, reply) => {
    try {
      const { id, relatedTaskId, relationType } = request.params;
      const taskId = parseInt(id);
      const relatedId = parseInt(relatedTaskId);

      const deleted = await dbService.deleteTaskRelation(taskId, relatedId, relationType);

      if (!deleted) {
        return reply.code(404).send({ error: 'Relation not found' });
      }

      request.log.info(`Deleted ${relationType} relation: task ${taskId} -> ${relatedId}`);
      reply.send({ message: 'Relation deleted successfully' });
    } catch (error) {
      request.log.error(error, 'Failed to delete task relation');
      reply.code(500).send({ error: 'Failed to delete task relation' });
    }
  });

  // GET /tasks/:id/readiness - Check if a task's dependencies are met
  fastify.get('/tasks/:id/readiness', {
    schema: taskGraphSchemas.checkTaskReadiness
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const taskId = parseInt(id);

      const task = await dbService.getTaskById(taskId);
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      const readiness = await dbService.checkTaskReadiness(taskId);
      reply.send(readiness);
    } catch (error) {
      request.log.error(error, 'Failed to check task readiness');
      reply.code(500).send({ error: 'Failed to check task readiness' });
    }
  });

  // GET /coordination-requirements - List all coordination requirement definitions
  fastify.get('/coordination-requirements', {
    schema: taskGraphSchemas.getCoordinationRequirements
  }, async (request, reply) => {
    try {
      const defs = await dbService.getCoordinationRequirementDefinitions();
      reply.send(defs);
    } catch (error) {
      request.log.error(error, 'Failed to fetch coordination requirements');
      reply.code(500).send({ error: 'Failed to fetch coordination requirements' });
    }
  });
}
