import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';
import routes from '../../src/routes/index.js';
import { tokenService } from '../../src/services/tokenService.js';

let testApp = null;

/**
 * Create a Fastify test server instance
 * Does NOT start an HTTP server - uses inject() for testing
 * Swagger is not registered here; tests only need the API routes.
 */
export async function createTestServer() {
  const app = Fastify({
    logger: false // Disable logging in tests
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

  await app.register(cors, {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  await app.register(routes);

  // Ensure cache reflects the current test DB contents before requests run.
  await tokenService.refreshCache();

  testApp = app;
  return app;
}

/**
 * Close the test server
 */
export async function closeTestServer() {
  if (testApp) {
    await testApp.close();
    testApp = null;
  }
}

/**
 * Get a valid test token from seeded data
 * Uses Michael's token from seedUsers.js
 */
export function getTestToken() {
  return '550e8400-e29b-41d4-a716-446655440000';
}

export function getTestAgentToken(projectCode = 'ZAZZ') {
  if (projectCode === 'ZED_MER') {
    return '660e8400-e29b-41d4-a716-446655440103';
  }

  return '660e8400-e29b-41d4-a716-446655440101';
}
