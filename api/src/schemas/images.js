/**
 * Image route schemas.
 */

export const imageSchemas = {
  getTaskImages: {
    tags: ['images'],
    summary: 'List task images',
    description: 'Returns metadata (id, originalName, contentType, fileSize) for images attached to a task. Use GET /images/:id for binary.',
    params: {
      type: 'object',
      required: ['taskId'],
      properties: { taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' } }
    },
    response: {
      200: {
        description: 'List of image metadata',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            taskId: { type: 'number' },
            originalName: { type: 'string' },
            contentType: { type: 'string' },
            fileSize: { type: 'number' }
          }
        }
      }
    }
  },

  uploadTaskImages: {
    tags: ['images'],
    summary: 'Upload task images',
    description: 'Upload one or more images as base64. Body: { images: [{ originalName, contentType, fileSize, base64Data }] }. contentType must be image/*.',
    params: {
      type: 'object',
      required: ['taskId'],
      properties: { taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' } }
    },
    body: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            required: ['originalName', 'contentType', 'fileSize', 'base64Data'],
            properties: {
              originalName: { type: 'string' },
              contentType: { type: 'string', pattern: '^image/' },
              fileSize: { type: 'integer', minimum: 1 },
              base64Data: { type: 'string' }
            }
          }
        }
      }
    },
    response: {
      201: {
        description: 'Images uploaded',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          images: { type: 'array', items: { type: 'object' } },
          count: { type: 'number' }
        }
      }
    }
  },

  getImageById: {
    tags: ['images'],
    summary: 'Get image binary',
    description: 'Returns image binary. Use id from GET /tasks/:taskId/images. Content-Type indicates format.',
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', pattern: '^\\d+$', description: 'Numeric image id.' } }
    },
    response: {
      200: { description: 'Image binary' },
      404: { description: 'Image not found' }
    }
  },

  getImageMetadata: {
    tags: ['images'],
    summary: 'Get image metadata',
    description: 'Returns image metadata (id, taskId, originalName, contentType, fileSize) without binary. Use when you need metadata only.',
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', pattern: '^\\d+$', description: 'Numeric image id.' } }
    },
    response: {
      200: {
        description: 'Image metadata',
        type: 'object',
        properties: {
          id: { type: 'number' },
          taskId: { type: 'number' },
          originalName: { type: 'string' },
          contentType: { type: 'string' },
          fileSize: { type: 'number' }
        }
      },
      404: { description: 'Image not found' }
    }
  },

  deleteTaskImage: {
    tags: ['images'],
    summary: 'Delete task image',
    description: 'Deletes an image. Verifies image belongs to the specified task. Returns 403 if image belongs to different task.',
    params: {
      type: 'object',
      required: ['taskId', 'imageId'],
      properties: {
        taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' },
        imageId: { type: 'string', pattern: '^\\d+$', description: 'Numeric image id.' }
      }
    },
    response: {
      200: {
        description: 'Image deleted',
        type: 'object',
        properties: {
          message: { type: 'string' },
          image: { type: 'object' }
        }
      },
      403: { description: 'Image does not belong to the specified task' },
      404: { description: 'Image not found' }
    }
  }
};
