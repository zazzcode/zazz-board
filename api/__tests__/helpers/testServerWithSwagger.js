/**
 * Creates a Fastify app with Swagger registered (for OpenAPI spec tests).
 * Does NOT start HTTP server — use app.inject() or app.swagger().
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import routes from '../../src/routes/index.js';
import { tokenService } from '../../src/services/tokenService.js';

const BASE_URL = 'http://localhost:3030';

export async function createTestServerWithSwagger() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Zazz Board API',
        description: 'Test',
        version: '1.0.0'
      },
      servers: [{ url: BASE_URL, description: 'Local' }],
      components: {
        securitySchemes: {
          TB_TOKEN: { type: 'apiKey', in: 'header', name: 'TB_TOKEN' },
          Bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'UUID' }
        }
      },
      security: [{ TB_TOKEN: [] }]
    }
  });

  await app.register(routes);

  await tokenService.initialize();

  return app;
}
