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
const API_BASE_URL = process.env.API_BASE_URL || BASE_URL;

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
          description: `Kanban-style orchestration API for coordinating AI agents and humans. Auth: TB_TOKEN header or Authorization: Bearer (except /health, /, /db-test, /token-info, /openapi.json).

**Common operations (agent quick reference)**:
- Create deliverable: POST /projects/{projectCode}/deliverables — body: name, type; optional: specFilepath, planFilepath. Response id = use for create task.
- Create task: POST /projects/{code}/deliverables/{delivId}/tasks — delivId = numeric id from create deliverable. Body: title, prompt, phase, phaseStep.
- Update deliverable: PUT /projects/{projectCode}/deliverables/{id} — add specFilepath (spec path), planFilepath (plan path), gitWorktree, gitBranch when known.
- Change deliverable status: PATCH /projects/{projectCode}/deliverables/{id}/status — body: { status }.
- Change task status: PATCH /projects/{code}/deliverables/{delivId}/tasks/{taskId}/status — body: { status }; optional agentName to claim.`,
          version: '1.0.0'
        },
        servers: [{ url: API_BASE_URL, description: API_BASE_URL === BASE_URL ? 'Local' : 'API server' }],
        tags: [
          { name: 'core', description: 'Health and info' },
          { name: 'users', description: 'User management' },
          { name: 'projects', description: 'Projects and task/deliverable workflows' },
          { name: 'deliverables', description: 'Deliverables CRUD and status' },
          { name: 'task-graph', description: 'Task relations, graph, readiness' },
          { name: 'tags', description: 'Tags' },
          { name: 'translations', description: 'i18n' },
          { name: 'status-definitions', description: 'Status lookup' },
          { name: 'images', description: 'Project-scoped task and deliverable images' }
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

    // OpenAPI JSON spec — public so agents can fetch without auth
    app.get('/openapi.json', {
      schema: { hide: true }
    }, async (request, reply) => {
      reply.type('application/json');
      return app.swagger();
    });

    // Docs UI: unauthenticated for dev convenience (matches main's prior behavior)
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        filter: true,
        persistAuthorization: true
      }
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
