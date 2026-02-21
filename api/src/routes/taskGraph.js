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

  // GET /projects/:code/tasks/:taskId/relations - Get all relations for a task
  fastify.get('/projects/:code/tasks/:taskId/relations', {
    schema: taskGraphSchemas.getTaskRelations
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const task = await dbService.getTaskById(taskIdNum);
      if (!task || task.projectId !== project.id) {
        return reply.code(404).send({ error: 'Task not found in this project' });
      }

      const relations = await dbService.getTaskRelations(taskIdNum);
      reply.send(relations);
    } catch (error) {
      request.log.error(error, 'Failed to fetch task relations');
      reply.code(500).send({ error: 'Failed to fetch task relations' });
    }
  });

  // POST /projects/:code/tasks/:taskId/relations - Create a task relation
  fastify.post('/projects/:code/tasks/:taskId/relations', {
    schema: taskGraphSchemas.createTaskRelation
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const { relatedTaskId, relationType } = request.body;
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const task = await dbService.getTaskById(taskIdNum);
      if (!task || task.projectId !== project.id) {
        return reply.code(404).send({ error: 'Task not found in this project' });
      }

      const relations = await dbService.createTaskRelation(
        taskIdNum,
        relatedTaskId,
        relationType,
        request.user.id
      );

      request.log.info(`Created ${relationType} relation: task ${taskIdNum} -> ${relatedTaskId}`);
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

  // DELETE /projects/:code/tasks/:taskId/relations/:relatedTaskId/:relationType - Delete a task relation
  fastify.delete('/projects/:code/tasks/:taskId/relations/:relatedTaskId/:relationType', {
    schema: taskGraphSchemas.deleteTaskRelation
  }, async (request, reply) => {
    try {
      const { code, taskId, relatedTaskId, relationType } = request.params;
      const taskIdNum = parseInt(taskId);
      const relatedId = parseInt(relatedTaskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const task = await dbService.getTaskById(taskIdNum);
      if (!task || task.projectId !== project.id) {
        return reply.code(404).send({ error: 'Task not found in this project' });
      }

      const deleted = await dbService.deleteTaskRelation(taskIdNum, relatedId, relationType);

      if (!deleted) {
        return reply.code(404).send({ error: 'Relation not found' });
      }

      request.log.info(`Deleted ${relationType} relation: task ${taskIdNum} -> ${relatedId}`);
      reply.send({ message: 'Relation deleted successfully' });
    } catch (error) {
      request.log.error(error, 'Failed to delete task relation');
      reply.code(500).send({ error: 'Failed to delete task relation' });
    }
  });

  // GET /projects/:code/tasks/:taskId/readiness - Check if a task's dependencies are met
  fastify.get('/projects/:code/tasks/:taskId/readiness', {
    schema: taskGraphSchemas.checkTaskReadiness
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const taskIdNum = parseInt(taskId);

      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const task = await dbService.getTaskById(taskIdNum);
      if (!task || task.projectId !== project.id) {
        return reply.code(404).send({ error: 'Task not found in this project' });
      }

      const readiness = await dbService.checkTaskReadiness(taskIdNum);
      reply.send(readiness);
    } catch (error) {
      request.log.error(error, 'Failed to check task readiness');
      reply.code(500).send({ error: 'Failed to check task readiness' });
    }
  });

  // GET /projects/:code/deliverables/:delivId/graph - Get task graph scoped to a deliverable
  fastify.get('/projects/:code/deliverables/:delivId/graph', {
    schema: taskGraphSchemas.getDeliverableGraph
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const deliverableId = parseInt(delivId);

      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const deliverable = await dbService.getDeliverableById(deliverableId);
      if (!deliverable || deliverable.projectId !== project.id) {
        return reply.code(404).send({ error: 'Deliverable not found in this project' });
      }

      const graph = await dbService.getDeliverableTaskGraph(deliverableId);
      reply.send({
        deliverableId,
        projectCode: project.code,
        taskGraphLayoutDirection: project.taskGraphLayoutDirection,
        ...graph
      });
    } catch (error) {
      request.log.error(error, 'Failed to fetch deliverable task graph');
      reply.code(500).send({ error: 'Failed to fetch deliverable task graph' });
    }
  });

  // GET /coordination-types - List all coordination types
  fastify.get('/coordination-types', {
    schema: taskGraphSchemas.getCoordinationTypes
  }, async (request, reply) => {
    try {
      const defs = await dbService.getCoordinationTypes();
      reply.send(defs);
    } catch (error) {
      request.log.error(error, 'Failed to fetch coordination types');
      reply.code(500).send({ error: 'Failed to fetch coordination types' });
    }
  });
}
