import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import { tokenService } from './services/tokenService.js';
import cors from '@fastify/cors';

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

// Register routes
import routes from './routes/index.js';
app.register(routes);

// Start server
const start = async () => {
  try {
    // Register CORS
    await app.register(cors, {
      origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    });

    // Initialize token service before starting server
    await tokenService.initialize();
    
    await app.listen({ port: process.env.PORT || 3030, host: '0.0.0.0' });
    app.log.info(`Server running at http://localhost:${process.env.PORT || 3030}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

