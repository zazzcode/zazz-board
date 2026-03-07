import { authMiddleware } from '../middleware/authMiddleware.js';
import { fileLockSchemas } from '../schemas/validation.js';

export default async function fileLockRoutes(fastify, options) {
  const { dbService, realtimeService } = options;

  const publishEvent = (projectCode, payload) => {
    if (!realtimeService) return;
    realtimeService.publish(projectCode, payload);
  };

  const resolveScope = async (code, delivId) => {
    const project = await dbService.getProjectByCode(code);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    const deliverableId = parseInt(delivId, 10);
    if (!Number.isFinite(deliverableId)) {
      const error = new Error('Invalid deliverable id');
      error.statusCode = 400;
      throw error;
    }

    const deliverable = await dbService.getDeliverableById(deliverableId);
    if (!deliverable || deliverable.projectId !== project.id) {
      const error = new Error('Deliverable not found');
      error.statusCode = 404;
      throw error;
    }

    return { project, deliverable, deliverableId };
  };

  const resolveErrorStatus = (error, fallback = 500) => {
    if (error?.statusCode) return error.statusCode;
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('not found')) return 404;
    if (message.includes('required') || message.includes('invalid')) return 400;
    return fallback;
  };

  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:code/deliverables/:delivId/locks', {
    schema: fileLockSchemas.listLocks
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const { project, deliverableId } = await resolveScope(code, delivId);
      const locks = await dbService.listActiveFileLocks({
        projectId: project.id,
        deliverableId,
      });
      reply.send({
        deliverableId,
        projectCode: project.code,
        lockCount: locks.length,
        locks,
      });
    } catch (error) {
      request.log.error(error, 'Failed to list file locks');
      reply.code(resolveErrorStatus(error)).send({ error: error.message || 'Failed to list file locks' });
    }
  });

  fastify.post('/projects/:code/deliverables/:delivId/locks/acquire', {
    schema: fileLockSchemas.acquireLocks
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const { project, deliverableId } = await resolveScope(code, delivId);
      const { taskId, phaseStep, agentName, filePaths, ttlSeconds } = request.body;

      const result = await dbService.acquireFileLocks({
        projectId: project.id,
        deliverableId,
        taskId,
        phaseStep: phaseStep || null,
        agentName,
        filePaths,
        ttlSeconds,
        userId: request.user?.id || null,
      });

      if (!result.acquired) {
        return reply.code(409).send({
          error: 'FILE_LOCK_CONFLICT',
          message: 'One or more files are currently locked by another task/agent',
          pollIntervalSeconds: 3,
          conflicts: result.conflicts,
        });
      }

      publishEvent(project.code, {
        type: 'file-lock',
        eventType: 'file-lock.acquired',
        deliverableId,
        taskId,
        phaseStep: phaseStep || null,
        agentName,
        filePaths,
      });

      reply.send(result);
    } catch (error) {
      request.log.error(error, 'Failed to acquire file locks');
      reply.code(resolveErrorStatus(error)).send({ error: error.message || 'Failed to acquire file locks' });
    }
  });

  fastify.post('/projects/:code/deliverables/:delivId/locks/heartbeat', {
    schema: fileLockSchemas.heartbeatLocks
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const { project, deliverableId } = await resolveScope(code, delivId);
      const { taskId, agentName, filePaths, ttlSeconds } = request.body;

      const result = await dbService.heartbeatFileLocks({
        projectId: project.id,
        deliverableId,
        taskId,
        agentName,
        filePaths: filePaths || [],
        ttlSeconds,
        userId: request.user?.id || null,
      });

      publishEvent(project.code, {
        type: 'file-lock',
        eventType: 'file-lock.heartbeat',
        deliverableId,
        taskId,
        agentName,
        filePaths: filePaths || [],
      });

      reply.send(result);
    } catch (error) {
      request.log.error(error, 'Failed to heartbeat file locks');
      reply.code(resolveErrorStatus(error)).send({ error: error.message || 'Failed to heartbeat file locks' });
    }
  });

  fastify.post('/projects/:code/deliverables/:delivId/locks/release', {
    schema: fileLockSchemas.releaseLocks
  }, async (request, reply) => {
    try {
      const { code, delivId } = request.params;
      const { project, deliverableId } = await resolveScope(code, delivId);
      const { taskId, agentName, filePaths } = request.body;

      const result = await dbService.releaseFileLocks({
        projectId: project.id,
        deliverableId,
        taskId,
        agentName,
        filePaths: filePaths || [],
      });

      publishEvent(project.code, {
        type: 'file-lock',
        eventType: 'file-lock.released',
        deliverableId,
        taskId,
        agentName,
        filePaths: filePaths || [],
      });

      reply.send(result);
    } catch (error) {
      request.log.error(error, 'Failed to release file locks');
      reply.code(resolveErrorStatus(error)).send({ error: error.message || 'Failed to release file locks' });
    }
  });
}
