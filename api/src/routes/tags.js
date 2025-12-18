import { tagSchemas } from '../schemas/validation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function tagRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all tag routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /tags - List all tags with usage counts
  fastify.get('/tags', {
    schema: tagSchemas.getTags
  }, async (request, reply) => {
    try {
      const { search } = request.query;
      const tags = await dbService.getTags(search);
      reply.send(tags);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch tags' });
    }
  });

  // GET /tags/:id - Get specific tag
  fastify.get('/tags/:id', {
    schema: tagSchemas.getTagById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const tag = await dbService.getTagById(parseInt(id));
      
      if (!tag) {
        return reply.code(404).send({ error: 'Tag not found' });
      }
      
      reply.send(tag);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch tag' });
    }
  });

  // POST /tags - Create new tag (with dual validation)
  fastify.post('/tags', {
    schema: tagSchemas.createTag
  }, async (request, reply) => {
    try {
      // The API-level AJV validation happens automatically
      // Database-level validation happens in the service
      const tag = await dbService.createTag(request.body);
      reply.code(201).send(tag);
    } catch (error) {
      fastify.log.error(error);
      
      // Handle database-level validation errors
      if (error.message.includes('Tag name')) {
        reply.code(400).send({ error: error.message });
      } else if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'Tag with this name already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to create tag' });
      }
    }
  });

  // PUT /tags/:id - Update tag (with dual validation)
  fastify.put('/tags/:id', {
    schema: tagSchemas.updateTag
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const tag = await dbService.updateTag(parseInt(id), request.body);
      
      if (!tag) {
        return reply.code(404).send({ error: 'Tag not found' });
      }
      
      reply.send(tag);
    } catch (error) {
      fastify.log.error(error);
      
      // Handle database-level validation errors
      if (error.message.includes('Tag name')) {
        reply.code(400).send({ error: error.message });
      } else if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'Tag with this name already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to update tag' });
      }
    }
  });

  // DELETE /tags/:id - Delete tag
  fastify.delete('/tags/:id', {
    schema: tagSchemas.deleteTag
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const tag = await dbService.deleteTag(parseInt(id));
      
      if (!tag) {
        return reply.code(404).send({ error: 'Tag not found' });
      }
      
      reply.send({ message: 'Tag deleted successfully', tag });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to delete tag' });
    }
  });
}
