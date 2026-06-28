import { authMiddleware } from '../middleware/authMiddleware.js';
import { ganttSchemas } from '../schemas/validation.js';

function publishProjectEvent(realtimeService, projectCode, payload) {
  if (!realtimeService) return;
  realtimeService.publish(projectCode, payload);
}

function mapBusinessError(reply, error) {
  if (error.statusCode === 409) {
    return reply.code(409).send({
      error: error.message,
      latestProjection: error.latestProjection,
    });
  }
  if (error.message?.toLowerCase().includes('not found')) {
    return reply.code(404).send({ error: error.message });
  }
  return reply.code(400).send({ error: error.message || 'Invalid Gantt request' });
}

function toTaskGanttRow(task, deliverableId) {
  const completed = ['COMPLETED', 'DONE'].includes(task.status);
  const startDate = task.startedAt || task.createdAt;
  const endDate = task.completedAt || task.updatedAt || task.createdAt;

  return {
    id: `task:${task.id}`,
    entityType: 'task',
    parentId: `deliverable:${deliverableId}`,
    displayName: task.title,
    startDate: new Date(startDate).toISOString().slice(0, 10),
    endDate: new Date(endDate).toISOString().slice(0, 10),
    status: task.status,
    statusCategory: task.isBlocked ? 'BLOCKED' : completed ? 'COMPLETED' : 'IN_PROGRESS',
    progress: completed ? 100 : 0,
    completed,
    blocked: Boolean(task.isBlocked),
  };
}

function requireProjectLeader(project, request, reply) {
  if (project.leaderId !== request.user.id) {
    reply.code(403).send({ error: 'Only project leaders can update Gantt configuration' });
    return false;
  }
  return true;
}

export default async function ganttRoutes(fastify, options) {
  const { dbService, realtimeService } = options;
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:code/gantt', { schema: ganttSchemas.getProjectGantt }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const gantt = await dbService.getProjectGantt(project.id);
      reply.send(gantt);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project Gantt' });
    }
  });

  fastify.get('/projects/:code/gantt/settings', { schema: ganttSchemas.getProjectGanttSettings }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const settings = await dbService.getProjectGanttSettings(project.id);
      reply.send(settings);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project Gantt settings' });
    }
  });

  fastify.put('/projects/:code/gantt/settings', { schema: ganttSchemas.updateProjectGanttSettings }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const settings = await dbService.updateProjectGanttSettings(project.id, request.body, request.user.id);
      publishProjectEvent(realtimeService, project.code, {
        type: 'gantt',
        eventType: 'gantt.settings_updated',
      });
      reply.send(settings);
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.get('/projects/:code/milestones', { schema: ganttSchemas.listMilestones }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      reply.send(await dbService.getMilestonesForProject(project.id));
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch milestones' });
    }
  });

  fastify.post('/projects/:code/milestones', { schema: ganttSchemas.createMilestone }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const milestone = await dbService.createMilestone(project.id, request.body, request.user.id);
      publishProjectEvent(realtimeService, project.code, {
        type: 'milestone',
        eventType: 'milestone.created',
        milestoneId: milestone.id,
      });
      reply.code(201).send(milestone);
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.put('/projects/:code/milestones/:milestoneId', { schema: ganttSchemas.updateMilestone }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const milestone = await dbService.updateMilestone(
        project.id,
        Number(request.params.milestoneId),
        request.body,
        request.user.id
      );
      if (!milestone) return reply.code(404).send({ error: 'Milestone not found' });
      publishProjectEvent(realtimeService, project.code, {
        type: 'milestone',
        eventType: 'milestone.updated',
        milestoneId: milestone.id,
      });
      reply.send(milestone);
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.delete('/projects/:code/milestones/:milestoneId', { schema: ganttSchemas.deleteMilestone }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const deleted = await dbService.deleteMilestone(project.id, Number(request.params.milestoneId));
      if (!deleted) return reply.code(404).send({ error: 'Milestone not found' });
      publishProjectEvent(realtimeService, project.code, {
        type: 'milestone',
        eventType: 'milestone.deleted',
        milestoneId: deleted.id,
      });
      reply.send({ message: 'Milestone deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.patch('/projects/:code/gantt/deliverables/:id/milestone', { schema: ganttSchemas.updateDeliverableMilestone }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const updated = await dbService.updateDeliverableMilestone(
        project.id,
        Number(request.params.id),
        request.body.milestoneId,
        request.user.id
      );
      if (!updated) return reply.code(404).send({ error: 'Deliverable not found' });
      publishProjectEvent(realtimeService, project.code, {
        type: 'gantt',
        eventType: 'gantt.deliverable_milestone_changed',
        deliverableId: updated.id,
        milestoneId: updated.milestoneId,
      });
      reply.send(await dbService.getProjectGantt(project.id));
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.put('/projects/:code/milestones/:milestoneId/deliverables', { schema: ganttSchemas.replaceMilestoneDeliverables }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      if (!requireProjectLeader(project, request, reply)) return;
      const projection = await dbService.replaceMilestoneDeliverables(
        project.id,
        Number(request.params.milestoneId),
        request.body.deliverableIds,
        request.body.expectedVersion || null,
        request.user.id
      );
      if (!projection) return reply.code(404).send({ error: 'Milestone not found' });
      publishProjectEvent(realtimeService, project.code, {
        type: 'milestone',
        eventType: 'milestone.deliverables_reordered',
        milestoneId: Number(request.params.milestoneId),
      });
      reply.send(projection);
    } catch (error) {
      request.log.error(error);
      return mapBusinessError(reply, error);
    }
  });

  fastify.get('/projects/:code/gantt/deliverables/:deliverableId/tasks', { schema: ganttSchemas.getDeliverableGanttTasks }, async (request, reply) => {
    try {
      const project = await dbService.getProjectByCode(request.params.code);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      const deliverable = await dbService.getDeliverableById(Number(request.params.deliverableId));
      if (!deliverable || deliverable.projectId !== project.id) {
        return reply.code(404).send({ error: 'Deliverable not found' });
      }
      const tasks = await dbService.getTasksForDeliverable(deliverable.id);
      reply.send({
        projectCode: project.code,
        deliverableId: String(deliverable.id),
        rows: tasks.map((task) => toTaskGanttRow(task, deliverable.id)),
        links: [],
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch deliverable Gantt tasks' });
    }
  });
}
