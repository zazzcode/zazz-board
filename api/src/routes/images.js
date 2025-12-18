import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function imageRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all image routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /tasks/:taskId/images - Get all images for a task
  fastify.get('/tasks/:taskId/images', async (request, reply) => {
    try {
      const { taskId } = request.params;
      request.log.info(`Fetching images for task ${taskId}`);
      
      const images = await dbService.getTaskImages(parseInt(taskId));
      request.log.info(`Found ${images.length} images for task ${taskId}`);
      
      reply.send(images);
    } catch (error) {
      request.log.error(error, 'Failed to fetch task images');
      reply.code(500).send({ error: 'Failed to fetch task images' });
    }
  });

  // POST /tasks/:taskId/images/upload - Upload images to a task
  fastify.post('/tasks/:taskId/images/upload', async (request, reply) => {
    try {
      const { taskId } = request.params;
      const { images } = request.body;
      
      request.log.info(`Uploading ${images?.length || 0} images to task ${taskId}`);
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return reply.code(400).send({ error: 'No images provided' });
      }
      
      const uploadedImages = [];
      
      for (const imageData of images) {
        const { originalName, contentType, fileSize, base64Data } = imageData;
        
        // Validate required fields
        if (!originalName || !contentType || !fileSize || !base64Data) {
          request.log.warn('Skipping invalid image data', { originalName, contentType });
          continue;
        }
        
        // Validate content type
        if (!contentType.startsWith('image/')) {
          request.log.warn('Skipping non-image file', { originalName, contentType });
          continue;
        }
        
        const storedImage = await dbService.storeTaskImage(parseInt(taskId), {
          originalName,
          contentType,
          fileSize,
          base64Data
        });
        
        uploadedImages.push(storedImage);
      }
      
      request.log.info(`Successfully uploaded ${uploadedImages.length} images`);
      
      reply.code(201).send({
        success: true,
        images: uploadedImages,
        count: uploadedImages.length
      });
    } catch (error) {
      request.log.error(error, 'Failed to upload images');
      reply.code(500).send({ error: 'Failed to upload images' });
    }
  });

  // GET /images/:id - Serve individual image
  fastify.get('/images/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const imageId = parseInt(id);
      
      if (isNaN(imageId)) {
        return reply.code(400).send({ error: 'Invalid image ID' });
      }
      
      const imageWithData = await dbService.getImageWithData(imageId);
      
      if (!imageWithData || !imageWithData.data) {
        return reply.code(404).send({ error: 'Image not found' });
      }
      
      // Convert base64 to binary
      const binaryData = Buffer.from(imageWithData.data, 'base64');
      
      // Set proper headers
      reply
        .header('Content-Type', imageWithData.contentType)
        .header('Content-Length', binaryData.length)
        .header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        .send(binaryData);
        
    } catch (error) {
      request.log.error(error, 'Failed to serve image');
      reply.code(500).send({ error: 'Failed to serve image' });
    }
  });

  // GET /images/:id/metadata - Get image metadata only
  fastify.get('/images/:id/metadata', async (request, reply) => {
    try {
      const { id } = request.params;
      const imageId = parseInt(id);
      
      if (isNaN(imageId)) {
        return reply.code(400).send({ error: 'Invalid image ID' });
      }
      
      const metadata = await dbService.getImageMetadata(imageId);
      
      if (!metadata) {
        return reply.code(404).send({ error: 'Image not found' });
      }
      
      reply.send(metadata);
    } catch (error) {
      request.log.error(error, 'Failed to fetch image metadata');
      reply.code(500).send({ error: 'Failed to fetch image metadata' });
    }
  });

  // DELETE /tasks/:taskId/images/:imageId - Delete specific image from task (with security validation)
  fastify.delete('/tasks/:taskId/images/:imageId', async (request, reply) => {
    try {
      const { taskId, imageId } = request.params;
      const taskIdNum = parseInt(taskId);
      const imageIdNum = parseInt(imageId);
      
      if (isNaN(taskIdNum) || isNaN(imageIdNum)) {
        return reply.code(400).send({ error: 'Invalid task ID or image ID' });
      }
      
      request.log.info(`Deleting image ${imageIdNum} from task ${taskIdNum}`);
      
      // First verify the image belongs to the specified task
      const imageMetadata = await dbService.getImageMetadata(imageIdNum);
      
      if (!imageMetadata) {
        return reply.code(404).send({ error: 'Image not found' });
      }
      
      if (imageMetadata.taskId !== taskIdNum) {
        return reply.code(403).send({ error: 'Image does not belong to the specified task' });
      }
      
      // Now delete the image
      const deletedImage = await dbService.deleteImage(imageIdNum);
      
      reply.send({ message: 'Image deleted successfully', image: deletedImage });
    } catch (error) {
      request.log.error(error, 'Failed to delete image');
      reply.code(500).send({ error: 'Failed to delete image' });
    }
  });
}
