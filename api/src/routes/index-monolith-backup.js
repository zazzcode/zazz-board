import DatabaseService from '../services/databaseService.js';
import { 
  tagSchemas, 
  taskSchemas, 
  projectSchemas, 
  userSchemas 
} from '../schemas/validation.js';

const dbService = new DatabaseService();

export default async function (app, opts) {
  // Health check endpoint
  app.get('/health', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint
  app.get('/', async (request, reply) => {
    reply.send({ 
      message: 'Task Blaster API', 
      version: '1.0.0',
      endpoints: ['/health', '/users', '/projects', '/tasks', '/tags']
    });
  });

  // Database connection test
  app.get('/db-test', async (request, reply) => {
    try {
      const result = await dbService.testConnection();
      reply.send({ status: 'Database connected', result });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Database connection failed', details: error.message });
    }
  });

  // ==================== USER ROUTES ====================
  
  // GET /users - List all users with optional search
  app.get('/users', {
    schema: userSchemas.getUsers
  }, async (request, reply) => {
    try {
      const { search } = request.query;
      const users = await dbService.getUsers(search);
      reply.send(users);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // GET /users/:id - Get specific user
  app.get('/users/:id', {
    schema: userSchemas.getUserById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.getUserById(parseInt(id));
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send(user);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });

  // POST /users - Create new user
  app.post('/users', {
    schema: userSchemas.createUser
  }, async (request, reply) => {
    try {
      const user = await dbService.createUser(request.body);
      reply.code(201).send(user);
    } catch (error) {
      app.log.error(error);
      if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'User with this email or username already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to create user' });
      }
    }
  });

  // PUT /users/:id - Update user
  app.put('/users/:id', {
    schema: userSchemas.updateUser
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.updateUser(parseInt(id), request.body);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send(user);
    } catch (error) {
      app.log.error(error);
      if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'User with this email or username already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to update user' });
      }
    }
  });

  // DELETE /users/:id - Delete user
  app.delete('/users/:id', {
    schema: userSchemas.deleteUser
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.deleteUser(parseInt(id));
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send({ message: 'User deleted successfully', user });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to delete user' });
    }
  });

  // ==================== PROJECT ROUTES ====================
  
  // GET /projects - List all projects with details
  app.get('/projects', {
    schema: projectSchemas.getProjects
  }, async (request, reply) => {
    try {
      const projects = await dbService.getProjectsWithDetails();
      reply.send(projects);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // GET /projects/:id - Get specific project
  app.get('/projects/:id', {
    schema: projectSchemas.getProjectById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.getProjectById(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project' });
    }
  });

  // POST /projects - Create new project
  app.post('/projects', {
    schema: projectSchemas.createProject
  }, async (request, reply) => {
    try {
      const project = await dbService.createProject(request.body);
      reply.code(201).send(project);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  // PUT /projects/:id - Update project
  app.put('/projects/:id', {
    schema: projectSchemas.updateProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.updateProject(parseInt(id), request.body);
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to update project' });
    }
  });

  // DELETE /projects/:id - Delete project
  app.delete('/projects/:id', {
    schema: projectSchemas.deleteProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.deleteProject(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send({ message: 'Project deleted successfully', project });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to delete project' });
    }
  });

  // GET /projects/:id/tasks - Get tasks for project
  app.get('/projects/:id/tasks', {
    schema: projectSchemas.getProjectTasks
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, priority } = request.query;
      
      const tasks = await dbService.getTasksForProject(parseInt(id), { status, priority });
      reply.send(tasks);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project tasks' });
    }
  });

  // ==================== TASK ROUTES ====================
  
  // GET /tasks - List all tasks with filters
  app.get('/tasks', {
    schema: taskSchemas.getTasks
  }, async (request, reply) => {
    try {
      request.log.info('Processing tasks request with filters');
      
      const { projectId, status, priority, assigneeId, search } = request.query;
      const filters = {
        projectId: projectId ? parseInt(projectId) : undefined,
        status,
        priority,
        assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
        search
      };
      
      const tasks = await dbService.getTasks(filters);
      request.log.info(`Retrieved ${tasks.length} tasks`);
      reply.send(tasks);
    } catch (error) {
      request.log.error(error, 'Failed to fetch tasks');
      reply.code(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // GET /tasks/:id - Get specific task
  app.get('/tasks/:id', {
    schema: taskSchemas.getTaskById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await dbService.getTaskById(parseInt(id));
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch task' });
    }
  });

  // POST /tasks - Create new task
  app.post('/tasks', {
    schema: taskSchemas.createTask
  }, async (request, reply) => {
    try {
      const task = await dbService.createTask(request.body);
      reply.code(201).send(task);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to create task' });
    }
  });

  // PUT /tasks/:id - Update task
  app.put('/tasks/:id', {
    schema: taskSchemas.updateTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await dbService.updateTask(parseInt(id), request.body);
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // DELETE /tasks/:id - Delete task
  app.delete('/tasks/:id', {
    schema: taskSchemas.deleteTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await dbService.deleteTask(parseInt(id));
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send({ message: 'Task deleted successfully', task });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to delete task' });
    }
  });

  // PATCH /tasks/:id/reorder - Reorder task position
  app.patch('/tasks/:id/reorder', {
    schema: taskSchemas.reorderTask
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { position } = request.body;
      
      const task = await dbService.reorderTask(parseInt(id), position);
      
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      reply.send(task);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to reorder task' });
    }
  });

  // PUT /tasks/:taskId/tags - Set task tags
  app.put('/tasks/:taskId/tags', {
    schema: taskSchemas.setTaskTags
  }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const { tagIds } = request.body;
      
      await dbService.setTaskTags(parseInt(taskId), tagIds);
      const updatedTags = await dbService.getTagsForTask(parseInt(taskId));
      
      reply.send({ message: 'Task tags updated successfully', tags: updatedTags });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to update task tags' });
    }
  });

  // ==================== TAG ROUTES ====================
  
  // GET /tags - List all tags with usage counts
  app.get('/tags', {
    schema: tagSchemas.getTags
  }, async (request, reply) => {
    try {
      const { search } = request.query;
      const tags = await dbService.getTags(search);
      reply.send(tags);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch tags' });
    }
  });

  // GET /tags/:id - Get specific tag
  app.get('/tags/:id', {
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
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch tag' });
    }
  });

  // POST /tags - Create new tag (with dual validation)
  app.post('/tags', {
    schema: tagSchemas.createTag
  }, async (request, reply) => {
    try {
      // The API-level AJV validation happens automatically
      // Database-level validation happens in the service
      const tag = await dbService.createTag(request.body);
      reply.code(201).send(tag);
    } catch (error) {
      app.log.error(error);
      
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
  app.put('/tags/:id', {
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
      app.log.error(error);
      
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
  app.delete('/tags/:id', {
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
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to delete tag' });
    }
  });

  // ==================== IMAGE ROUTES ====================
  
  // GET /tasks/:taskId/images - Get all images for a task
  app.get('/tasks/:taskId/images', async (request, reply) => {
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
  app.post('/tasks/:taskId/images/upload', async (request, reply) => {
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
  app.get('/images/:id', async (request, reply) => {
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
  app.get('/images/:id/metadata', async (request, reply) => {
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
  app.delete('/tasks/:taskId/images/:imageId', async (request, reply) => {
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

