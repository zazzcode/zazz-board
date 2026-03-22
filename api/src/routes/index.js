import DatabaseService from '../services/databaseService.js';
import RealtimeService from '../services/realtimeService.js';
import { tokenService } from '../services/tokenService.js';
import { coreSchemas } from '../schemas/validation.js';

// Import route plugins
import userRoutes from './users.js';
import projectRoutes from './projects.js';
import taskRoutes from './tasks.js';
import tagRoutes from './tags.js';
import imageRoutes from './images.js';
import translationsRoutes from './translations.js';
import statusDefinitionsRoutes from './statusDefinitions.js';
import taskGraphRoutes from './taskGraph.js';
import deliverableRoutes from './deliverables.js';
import fileLockRoutes from './fileLocks.js';
import agentTokenRoutes from './agentTokens.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const dbService = new DatabaseService();
const realtimeService = new RealtimeService();

export default async function routes(fastify, _options) {
  // Health check endpoint (public)
  fastify.get('/health', { schema: coreSchemas.getHealth }, async (request, reply) => {
    const tokenStats = tokenService.getCacheStats();
    reply.send({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      auth: {
        tokenCacheInitialized: tokenStats.isInitialized,
        userCount: tokenStats.userCount
      }
    });
  });

  // Root endpoint (public)
  fastify.get('/', { schema: coreSchemas.getRoot }, async (request, reply) => {
    reply.send({ 
      message: 'Zazz Board API', 
      version: '1.0.0',
      endpoints: ['/health', '/users', '/projects', '/deliverables', '/tasks', '/tags', '/projects/:code/images/:id', '/projects/:code/deliverables/:delivId/locks', '/translations', '/status-definitions', '/coordination-types']
    });
  });

  // Database connection test (public)
  fastify.get('/db-test', { schema: coreSchemas.getDbTest }, async (request, reply) => {
    try {
      const result = await dbService.testConnection();
      reply.send({ status: 'Database connected', result });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Database connection failed', details: error.message });
    }
  });

  // Token info endpoint (public, for debugging)
  fastify.get('/token-info', { schema: coreSchemas.getTokenInfo }, async (request, reply) => {
    const tokenStats = tokenService.getCacheStats();
    reply.send({
      cacheInitialized: tokenStats.isInitialized,
      userCount: tokenStats.userCount,
      // Don't expose actual tokens in production
      hasTokens: tokenStats.tokens.length > 0
    });
  });

  fastify.post('/token-cache/refresh', {
    schema: coreSchemas.refreshTokenCache,
    preHandler: authMiddleware,
  }, async (request, reply) => {
    await tokenService.refreshCache();
    const tokenStats = tokenService.getCacheStats();
    reply.send({
      success: true,
      auth: {
        tokenCacheInitialized: tokenStats.isInitialized,
        userCount: tokenStats.userCount,
        agentTokenCount: tokenStats.agentTokenCount,
        projectCount: tokenStats.projectCount,
      },
    });
  });

  // Register route plugins with shared database service
  const pluginOptions = { dbService, realtimeService };
  
  await fastify.register(userRoutes, pluginOptions);
  await fastify.register(projectRoutes, pluginOptions);
  await fastify.register(taskRoutes, pluginOptions);
  await fastify.register(tagRoutes, pluginOptions);
  await fastify.register(imageRoutes, pluginOptions);
  await fastify.register(translationsRoutes, pluginOptions);
  await fastify.register(statusDefinitionsRoutes, pluginOptions);
  await fastify.register(taskGraphRoutes, pluginOptions);
  await fastify.register(deliverableRoutes, pluginOptions);
  await fastify.register(fileLockRoutes, pluginOptions);
  await fastify.register(agentTokenRoutes, pluginOptions);
}
