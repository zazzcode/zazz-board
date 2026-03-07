import { authMiddleware } from '../middleware/authMiddleware.js';
import { imageSchemas } from '../schemas/validation.js';

function parseId(value) {
  return parseInt(value, 10);
}

export default async function imageRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all image routes
  fastify.addHook('preHandler', authMiddleware);

  async function resolveScopedTask(request, reply) {
    const { code, delivId, taskId } = request.params;
    const deliverableId = parseId(delivId);
    const taskIdNum = parseId(taskId);

    const project = await dbService.getProjectByCode(code);
    if (!project) {
      reply.code(404).send({ error: 'Project not found' });
      return null;
    }

    const deliverable = await dbService.getDeliverableById(deliverableId);
    if (!deliverable) {
      reply.code(404).send({ error: 'Deliverable not found' });
      return null;
    }
    if (deliverable.projectId !== project.id) {
      reply.code(403).send({ error: 'Deliverable does not belong to this project' });
      return null;
    }

    const task = await dbService.getTaskById(taskIdNum);
    if (!task) {
      reply.code(404).send({ error: 'Task not found' });
      return null;
    }
    if (task.projectId !== project.id || task.deliverableId !== deliverableId) {
      reply.code(403).send({ error: 'Task does not belong to this project/deliverable scope' });
      return null;
    }

    return { project, deliverable, task, deliverableId, taskIdNum };
  }

  async function resolveScopedDeliverable(request, reply) {
    const { code, delivId } = request.params;
    const deliverableId = parseId(delivId);

    const project = await dbService.getProjectByCode(code);
    if (!project) {
      reply.code(404).send({ error: 'Project not found' });
      return null;
    }

    const deliverable = await dbService.getDeliverableById(deliverableId);
    if (!deliverable) {
      reply.code(404).send({ error: 'Deliverable not found' });
      return null;
    }
    if (deliverable.projectId !== project.id) {
      reply.code(403).send({ error: 'Deliverable does not belong to this project' });
      return null;
    }

    return { project, deliverable, deliverableId };
  }

  async function resolveImageOwnerProjectId(metadata) {
    if (metadata.taskId) {
      const task = await dbService.getTaskById(metadata.taskId);
      return task?.projectId ?? null;
    }
    if (metadata.deliverableId) {
      const deliverable = await dbService.getDeliverableById(metadata.deliverableId);
      return deliverable?.projectId ?? null;
    }
    return null;
  }

  // GET /projects/:code/deliverables/:delivId/tasks/:taskId/images
  fastify.get(
    '/projects/:code/deliverables/:delivId/tasks/:taskId/images',
    { schema: imageSchemas.getScopedTaskImages },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedTask(request, reply);
        if (!scoped) return;

        const images = await dbService.getTaskImages(scoped.taskIdNum);
        reply.send(images);
      } catch (error) {
        request.log.error(error, 'Failed to fetch scoped task images');
        reply.code(500).send({ error: 'Failed to fetch task images' });
      }
    }
  );

  // POST /projects/:code/deliverables/:delivId/tasks/:taskId/images/upload
  fastify.post(
    '/projects/:code/deliverables/:delivId/tasks/:taskId/images/upload',
    { schema: imageSchemas.uploadScopedTaskImages },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedTask(request, reply);
        if (!scoped) return;

        const { images } = request.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
          return reply.code(400).send({ error: 'No images provided' });
        }

        const uploadedImages = [];
        const imageUrlBase = `/projects/${encodeURIComponent(scoped.project.code)}/images`;

        for (const imageData of images) {
          const { originalName, contentType, fileSize, base64Data } = imageData;
          if (!originalName || !contentType || !fileSize || !base64Data) continue;
          if (!contentType.startsWith('image/')) continue;

          const storedImage = await dbService.storeTaskImage(
            scoped.taskIdNum,
            { originalName, contentType, fileSize, base64Data },
            imageUrlBase
          );
          uploadedImages.push(storedImage);
        }

        reply.code(201).send({
          success: true,
          images: uploadedImages,
          count: uploadedImages.length
        });
      } catch (error) {
        request.log.error(error, 'Failed to upload scoped task images');
        reply.code(500).send({ error: 'Failed to upload task images' });
      }
    }
  );

  // DELETE /projects/:code/deliverables/:delivId/tasks/:taskId/images/:imageId
  fastify.delete(
    '/projects/:code/deliverables/:delivId/tasks/:taskId/images/:imageId',
    { schema: imageSchemas.deleteScopedTaskImage },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedTask(request, reply);
        if (!scoped) return;

        const imageIdNum = parseId(request.params.imageId);
        const imageMetadata = await dbService.getImageMetadata(imageIdNum);
        if (!imageMetadata) {
          return reply.code(404).send({ error: 'Image not found' });
        }
        if (imageMetadata.taskId !== scoped.taskIdNum) {
          return reply.code(403).send({ error: 'Image does not belong to the specified task scope' });
        }

        const deletedImage = await dbService.deleteImage(imageIdNum);
        if (!deletedImage) {
          return reply.code(404).send({ error: 'Image not found' });
        }

        reply.send({ message: 'Image deleted successfully', image: deletedImage });
      } catch (error) {
        request.log.error(error, 'Failed to delete scoped task image');
        reply.code(500).send({ error: 'Failed to delete task image' });
      }
    }
  );

  // GET /projects/:code/deliverables/:delivId/images
  fastify.get(
    '/projects/:code/deliverables/:delivId/images',
    { schema: imageSchemas.getScopedDeliverableImages },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedDeliverable(request, reply);
        if (!scoped) return;

        const images = await dbService.getDeliverableImages(scoped.deliverableId);
        reply.send(images);
      } catch (error) {
        request.log.error(error, 'Failed to fetch scoped deliverable images');
        reply.code(500).send({ error: 'Failed to fetch deliverable images' });
      }
    }
  );

  // POST /projects/:code/deliverables/:delivId/images/upload
  fastify.post(
    '/projects/:code/deliverables/:delivId/images/upload',
    { schema: imageSchemas.uploadScopedDeliverableImages },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedDeliverable(request, reply);
        if (!scoped) return;

        const { images } = request.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
          return reply.code(400).send({ error: 'No images provided' });
        }

        const uploadedImages = [];
        const imageUrlBase = `/projects/${encodeURIComponent(scoped.project.code)}/images`;

        for (const imageData of images) {
          const { originalName, contentType, fileSize, base64Data } = imageData;
          if (!originalName || !contentType || !fileSize || !base64Data) continue;
          if (!contentType.startsWith('image/')) continue;

          const storedImage = await dbService.storeDeliverableImage(
            scoped.deliverableId,
            { originalName, contentType, fileSize, base64Data },
            imageUrlBase
          );
          uploadedImages.push(storedImage);
        }

        reply.code(201).send({
          success: true,
          images: uploadedImages,
          count: uploadedImages.length
        });
      } catch (error) {
        request.log.error(error, 'Failed to upload scoped deliverable images');
        reply.code(500).send({ error: 'Failed to upload deliverable images' });
      }
    }
  );

  // DELETE /projects/:code/deliverables/:delivId/images/:imageId
  fastify.delete(
    '/projects/:code/deliverables/:delivId/images/:imageId',
    { schema: imageSchemas.deleteScopedDeliverableImage },
    async (request, reply) => {
      try {
        const scoped = await resolveScopedDeliverable(request, reply);
        if (!scoped) return;

        const imageIdNum = parseId(request.params.imageId);
        const imageMetadata = await dbService.getImageMetadata(imageIdNum);
        if (!imageMetadata) {
          return reply.code(404).send({ error: 'Image not found' });
        }
        if (imageMetadata.deliverableId !== scoped.deliverableId) {
          return reply.code(403).send({ error: 'Image does not belong to the specified deliverable scope' });
        }

        const deletedImage = await dbService.deleteImage(imageIdNum);
        if (!deletedImage) {
          return reply.code(404).send({ error: 'Image not found' });
        }

        reply.send({ message: 'Image deleted successfully', image: deletedImage });
      } catch (error) {
        request.log.error(error, 'Failed to delete scoped deliverable image');
        reply.code(500).send({ error: 'Failed to delete deliverable image' });
      }
    }
  );

  // GET /projects/:code/images/:id
  fastify.get(
    '/projects/:code/images/:id',
    { schema: imageSchemas.getScopedImageById },
    async (request, reply) => {
      try {
        const { code, id } = request.params;
        const imageId = parseId(id);

        const project = await dbService.getProjectByCode(code);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        const metadata = await dbService.getImageMetadata(imageId);
        if (!metadata) {
          return reply.code(404).send({ error: 'Image not found' });
        }

        const ownerProjectId = await resolveImageOwnerProjectId(metadata);
        if (!ownerProjectId) {
          return reply.code(404).send({ error: 'Image owner not found' });
        }
        if (ownerProjectId !== project.id) {
          return reply.code(403).send({ error: 'Image does not belong to this project' });
        }

        const imageWithData = await dbService.getImageWithData(imageId);
        if (!imageWithData || !imageWithData.data) {
          return reply.code(404).send({ error: 'Image not found' });
        }

        const binaryData = Buffer.from(imageWithData.data, 'base64');
        reply
          .header('Content-Type', imageWithData.contentType)
          .header('Content-Length', binaryData.length)
          .header('Cache-Control', 'public, max-age=31536000')
          .send(binaryData);
      } catch (error) {
        request.log.error(error, 'Failed to serve scoped image');
        reply.code(500).send({ error: 'Failed to serve image' });
      }
    }
  );

  // GET /projects/:code/images/:id/metadata
  fastify.get(
    '/projects/:code/images/:id/metadata',
    { schema: imageSchemas.getScopedImageMetadata },
    async (request, reply) => {
      try {
        const { code, id } = request.params;
        const imageId = parseId(id);

        const project = await dbService.getProjectByCode(code);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        const metadata = await dbService.getImageMetadata(imageId);
        if (!metadata) {
          return reply.code(404).send({ error: 'Image not found' });
        }

        const ownerProjectId = await resolveImageOwnerProjectId(metadata);
        if (!ownerProjectId) {
          return reply.code(404).send({ error: 'Image owner not found' });
        }
        if (ownerProjectId !== project.id) {
          return reply.code(403).send({ error: 'Image does not belong to this project' });
        }

        reply.send(metadata);
      } catch (error) {
        request.log.error(error, 'Failed to fetch scoped image metadata');
        reply.code(500).send({ error: 'Failed to fetch image metadata' });
      }
    }
  );
}
