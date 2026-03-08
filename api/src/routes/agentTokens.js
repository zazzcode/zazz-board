import { authMiddleware } from '../middleware/authMiddleware.js';
import { agentTokenSchemas } from '../schemas/validation.js';
import { tokenService } from '../services/tokenService.js';

function resolveUserId(userIdParam, requestUserId) {
  if (userIdParam === 'me') {
    return requestUserId;
  }

  const parsed = Number(userIdParam);
  if (!Number.isInteger(parsed)) {
    throw new Error('Invalid user id');
  }

  return parsed;
}

function assertProjectLeader(project, requestUserId) {
  if (project.leaderId !== requestUserId) {
    throw new Error('Only project leaders can manage agent tokens for other users');
  }
}

function assertUserScope(project, userIdParam, requestUserId) {
  if (userIdParam === 'me') {
    return;
  }

  assertProjectLeader(project, requestUserId);
}

export default async function agentTokenRoutes(fastify, options) {
  const { dbService } = options;

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/projects/:code/users/:userId/agent-tokens',
    { schema: agentTokenSchemas.getUserAgentTokens },
    async (request, reply) => {
      try {
        const project = await dbService.getProjectByCode(request.params.code);
        if (!project) return reply.code(404).send({ error: 'Project not found' });

        assertUserScope(project, request.params.userId, request.user.id);
        const resolvedUserId = resolveUserId(request.params.userId, request.user.id);

        const result = await dbService.getAgentTokensForUser(project.id, resolvedUserId);
        if (!result) return reply.code(404).send({ error: 'User not found' });
        reply.send(result);
      } catch (error) {
        request.log.error(error);
        const code = error.message?.includes('leaders') ? 403 : 400;
        reply.code(code).send({ error: error.message || 'Failed to fetch agent tokens' });
      }
    },
  );

  fastify.get(
    '/projects/:code/agent-tokens',
    { schema: agentTokenSchemas.getProjectAgentTokens },
    async (request, reply) => {
      try {
        const project = await dbService.getProjectByCode(request.params.code);
        if (!project) return reply.code(404).send({ error: 'Project not found' });

        assertProjectLeader(project, request.user.id);
        const users = await dbService.getAgentTokensForProject(project.id);
        reply.send({ users });
      } catch (error) {
        request.log.error(error);
        const code = error.message?.includes('leaders') ? 403 : 400;
        reply.code(code).send({ error: error.message || 'Failed to fetch project agent tokens' });
      }
    },
  );

  fastify.post(
    '/projects/:code/users/:userId/agent-tokens',
    { schema: agentTokenSchemas.createAgentToken },
    async (request, reply) => {
      try {
        const project = await dbService.getProjectByCode(request.params.code);
        if (!project) return reply.code(404).send({ error: 'Project not found' });

        assertUserScope(project, request.params.userId, request.user.id);
        const resolvedUserId = resolveUserId(request.params.userId, request.user.id);

        const created = await dbService.createAgentToken(project.id, resolvedUserId, request.body?.label);
        tokenService.addAgentTokenToCache({
          token: created.token,
          userId: created.userId,
          projectId: created.projectId,
          projectCode: created.projectCode,
          email: created.userEmail,
          fullName: created.userFullName,
          label: created.label,
        });
        reply.code(201).send({
          id: created.id,
          token: created.token,
          label: created.label,
          createdAt: created.createdAt,
        });
      } catch (error) {
        request.log.error(error);
        if (error.message?.includes('leaders')) {
          return reply.code(403).send({ error: error.message });
        }
        if (error.message?.toLowerCase().includes('not found')) {
          return reply.code(404).send({ error: error.message });
        }
        reply.code(400).send({ error: error.message || 'Failed to create agent token' });
      }
    },
  );

  fastify.delete(
    '/projects/:code/users/:userId/agent-tokens/:id',
    { schema: agentTokenSchemas.deleteAgentToken },
    async (request, reply) => {
      try {
        const project = await dbService.getProjectByCode(request.params.code);
        if (!project) return reply.code(404).send({ error: 'Project not found' });

        assertUserScope(project, request.params.userId, request.user.id);
        const resolvedUserId = resolveUserId(request.params.userId, request.user.id);

        const tokenId = Number(request.params.id);
        const existing = await dbService.getAgentTokenById(tokenId);
        if (!existing || existing.projectId !== project.id || existing.userId !== resolvedUserId) {
          return reply.code(404).send({ error: 'Agent token not found' });
        }

        await dbService.deleteAgentToken(tokenId);
        tokenService.removeAgentTokenFromCache(existing.token);
        reply.send({ message: 'Token revoked' });
      } catch (error) {
        request.log.error(error);
        const code = error.message?.includes('leaders') ? 403 : 400;
        reply.code(code).send({ error: error.message || 'Failed to delete agent token' });
      }
    },
  );
}
