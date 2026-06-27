import { authMiddleware } from '../middleware/authMiddleware.js';
import { ganttSchemas } from '../schemas/validation.js';
import {
  getMockDeliverableGanttTasks,
  getMockProjectGantt,
  getMockProjectGanttSettings,
  updateMockProjectGanttSettings,
} from '../mockData/gantt/projectGantt.js';

export default async function ganttRoutes(fastify) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:code/gantt', { schema: ganttSchemas.getProjectGantt }, async (request, reply) => {
    const gantt = getMockProjectGantt(request.params.code);
    if (!gantt) return reply.code(404).send({ error: 'Project Gantt mock not found' });

    reply.send(gantt);
  });

  fastify.get(
    '/projects/:code/gantt/settings',
    { schema: ganttSchemas.getProjectGanttSettings },
    async (request, reply) => {
      const settings = getMockProjectGanttSettings(request.params.code);
      if (!settings) return reply.code(404).send({ error: 'Project Gantt settings mock not found' });

      reply.send(settings);
    }
  );

  fastify.put(
    '/projects/:code/gantt/settings',
    { schema: ganttSchemas.updateProjectGanttSettings },
    async (request, reply) => {
      const settings = updateMockProjectGanttSettings(request.params.code, request.body);
      if (!settings) return reply.code(404).send({ error: 'Project Gantt settings mock not found' });

      reply.send(settings);
    }
  );

  fastify.get(
    '/projects/:code/gantt/deliverables/:deliverableId/tasks',
    { schema: ganttSchemas.getDeliverableGanttTasks },
    async (request, reply) => {
      const tasks = getMockDeliverableGanttTasks(
        request.params.code,
        request.params.deliverableId
      );
      if (!tasks) return reply.code(404).send({ error: 'Deliverable Gantt mock not found' });

      reply.send(tasks);
    }
  );
}
