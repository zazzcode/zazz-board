import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import { tokenService } from './services/tokenService.js';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { authMiddleware } from './middleware/authMiddleware.js';
import routes from './routes/index.js';

// Create Fastify instance with built-in Pino logger
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Add correlation ID hook
app.addHook('onRequest', async (request, reply) => {
  request.correlationId = request.headers['x-correlation-id'] || randomUUID();
  request.log = request.log.child({ correlationId: request.correlationId });
});

// Add correlation ID to response headers
app.addHook('onSend', async (request, reply, payload) => {
  reply.header('x-correlation-id', request.correlationId);
  return payload;
});

const PORT = process.env.PORT || 3030;
const BASE_URL = `http://localhost:${PORT}`;

const start = async () => {
  try {
    await app.register(cors, {
      origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    });

    // Swagger must be registered before routes so route schemas are collected into the OpenAPI spec
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'Zazz Board API',
          description: 'Kanban-style orchestration API for coordinating AI agents and humans. All routes require `TB_TOKEN` header (or Authorization: Bearer).',
          version: '1.0.0'
        },
        servers: [{ url: BASE_URL, description: 'Local' }],
        tags: [
          { name: 'core', description: 'Health and info' },
          { name: 'users', description: 'User management' },
          { name: 'projects', description: 'Projects and task/deliverable workflows' },
          { name: 'deliverables', description: 'Deliverables CRUD and status' },
          { name: 'task-graph', description: 'Task relations, graph, readiness' },
          { name: 'tags', description: 'Tags' },
          { name: 'translations', description: 'i18n' },
          { name: 'status-definitions', description: 'Status lookup' },
          { name: 'images', description: 'Task images' }
        ],
        components: {
          securitySchemes: {
            TB_TOKEN: {
              type: 'apiKey',
              in: 'header',
              name: 'TB_TOKEN',
              description: 'UUID token from USERS.access_token (e.g. from seed: 550e8400-e29b-41d4-a716-446655440000)'
            },
            Bearer: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'UUID',
              description: 'Same token as TB_TOKEN in Authorization header'
            }
          }
        },
        security: [{ TB_TOKEN: [] }]
      }
    });

    await app.register(routes);

    // Docs: only authenticated users/agents can view. Token via header (TB_TOKEN/Bearer) or query (?token=) for browser
    await app.register(async (docsApp) => {
      docsApp.addHook('preHandler', async (request, reply) => {
        if (request.query?.token) {
          request.headers['tb_token'] = request.headers['tb_token'] || request.query.token;
        }
        return authMiddleware(request, reply);
      });
      await docsApp.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          filter: true,
          persistAuthorization: true
        }
      });
    });

    await tokenService.initialize();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Server running at ${BASE_URL}`);
    app.log.info(`API docs at ${BASE_URL}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

