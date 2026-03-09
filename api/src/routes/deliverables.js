import { authMiddleware } from '../middleware/authMiddleware.js';
import { deliverableSchemas } from '../schemas/validation.js';

export default async function deliverableRoutes(fastify, options) {
  const { dbService, realtimeService } = options;

  const publishEvent = (projectCode, payload) => {
    if (!realtimeService) return;
    realtimeService.publish(projectCode, payload);
  };
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:projectCode/deliverables', { schema: deliverableSchemas.getProjectDeliverables }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const { status, type } = request.query;
      const items = await dbService.getDeliverablesForProject(project.id, { status, type });
      reply.send(items);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch deliverables' });
    }
  });

  fastify.get('/projects/:projectCode/deliverables/:id', { schema: deliverableSchemas.getDeliverableById }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const item = await dbService.getDeliverableById(deliverableId);
      if (!item || item.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      reply.send(item);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch deliverable' });
    }
  });

  fastify.post('/projects/:projectCode/deliverables', { schema: deliverableSchemas.createDeliverable }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const created = await dbService.createDeliverable(project.id, request.body, request.user.id);
      publishEvent(project.code, {
        type: 'deliverable',
        eventType: 'deliverable.created',
        deliverableId: created.id,
        status: created.status,
      });
      reply.code(201).send(created);
    } catch (error) {
      request.log.error(error);
      if (error.message.includes('not found')) return reply.code(404).send({ error: error.message });
      reply.code(400).send({ error: error.message || 'Failed to create deliverable' });
    }
  });

  fastify.put('/projects/:projectCode/deliverables/:id', { schema: deliverableSchemas.updateDeliverable }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const existing = await dbService.getDeliverableById(deliverableId);
      if (!existing || existing.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      const updated = await dbService.updateDeliverable(deliverableId, request.body, request.user.id);
      publishEvent(project.code, {
        type: 'deliverable',
        eventType: 'deliverable.updated',
        deliverableId: updated.id,
        status: updated.status,
      });
      reply.send(updated);
    } catch (error) {
      request.log.error(error);
      reply.code(400).send({ error: error.message || 'Failed to update deliverable' });
    }
  });

  fastify.delete('/projects/:projectCode/deliverables/:id', { schema: deliverableSchemas.deleteDeliverable }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const existing = await dbService.getDeliverableById(deliverableId);
      if (!existing || existing.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      await dbService.deleteDeliverable(deliverableId);
      publishEvent(project.code, {
        type: 'deliverable',
        eventType: 'deliverable.deleted',
        deliverableId: deliverableId,
        status: existing.status,
      });
      reply.send({ message: 'Deliverable deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to delete deliverable' });
    }
  });

  fastify.patch('/projects/:projectCode/deliverables/:id/status', { schema: deliverableSchemas.updateDeliverableStatus }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const existing = await dbService.getDeliverableById(deliverableId);
      if (!existing || existing.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      const statusDef = await dbService.getStatusDefinitionByCode(request.body.status);
      if (!statusDef) return reply.code(400).send({ error: `Invalid status: ${request.body.status}` });
      const updated = await dbService.updateDeliverableStatus(deliverableId, request.body.status, request.user.id);
      const autoApproved = !existing.approvedAt && !!updated.approvedAt;
      publishEvent(project.code, {
        type: 'deliverable',
        eventType: 'deliverable.status_changed',
        deliverableId: updated.id,
        status: updated.status,
        previousStatus: existing.status,
        approved: autoApproved,
        approvedBy: updated.approvedBy,
        approvedAt: updated.approvedAt,
      });
      reply.send(updated);
    } catch (error) {
      request.log.error(error);
      const code = error.message?.toLowerCase().includes('not found') ? 404 : 400;
      reply.code(code).send({ error: error.message || 'Failed to update status' });
    }
  });

  fastify.patch('/projects/:projectCode/deliverables/:id/approve', { schema: deliverableSchemas.approveDeliverable }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const existing = await dbService.getDeliverableById(deliverableId);
      if (!existing || existing.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      const updated = await dbService.approveDeliverablePlan(deliverableId, request.user.id);
      publishEvent(project.code, {
        type: 'deliverable',
        eventType: 'deliverable.updated',
        deliverableId: updated.id,
        status: updated.status,
        approved: true,
        approvedBy: updated.approvedBy,
        approvedAt: updated.approvedAt,
      });
      reply.send(updated);
    } catch (error) {
      request.log.error(error);
      const code = error.message?.toLowerCase().includes('not found') ? 404 : 400;
      reply.code(code).send({ error: error.message || 'Failed to approve deliverable plan' });
    }
  });

  fastify.get('/projects/:projectCode/deliverables/:id/tasks', { schema: deliverableSchemas.getDeliverableTasks }, async (request, reply) => {
    try {
      const projectCode = request.params.projectCode;
      const deliverableId = parseInt(request.params.id);
      const project = await dbService.getProjectByCode(projectCode);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const existing = await dbService.getDeliverableById(deliverableId);
      if (!existing || existing.projectId !== project.id) return reply.code(404).send({ error: 'Deliverable not found' });
      const tasks = await dbService.getTasksForDeliverable(deliverableId);
      reply.send(tasks);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch deliverable tasks' });
    }
  });
}
