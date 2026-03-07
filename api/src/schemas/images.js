/**
 * Project-scoped image route schemas.
 */

const scopedProjectDeliverableParams = {
  type: 'object',
  required: ['code', 'delivId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
    delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' }
  }
};

const scopedProjectDeliverableTaskParams = {
  type: 'object',
  required: ['code', 'delivId', 'taskId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
    delivId: { type: 'string', pattern: '^\\d+$', description: 'Numeric deliverable id.' },
    taskId: { type: 'string', pattern: '^\\d+$', description: 'Numeric task id.' }
  }
};

const scopedImageIdParams = {
  type: 'object',
  required: ['code', 'id'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9]+$', description: 'Project code (e.g. ZAZZ).' },
    id: { type: 'string', pattern: '^\\d+$', description: 'Numeric image id.' }
  }
};

const imageUploadBody = {
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
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

const imageMetadataSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    taskId: { type: 'number', nullable: true },
    deliverableId: { type: 'number', nullable: true },
    originalName: { type: 'string' },
    contentType: { type: 'string' },
    fileSize: { type: 'number' },
    url: { type: 'string' },
    storageType: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

const uploadResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    images: { type: 'array', items: imageMetadataSchema },
    count: { type: 'number' }
  }
};

export const imageSchemas = {
  getScopedTaskImages: {
    tags: ['images'],
    summary: 'List task images (project scoped)',
    description: 'Returns image metadata for a task scoped to project + deliverable + task.',
    params: scopedProjectDeliverableTaskParams,
    response: {
      200: {
        description: 'Task image metadata list',
        type: 'array',
        items: imageMetadataSchema
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Task/deliverable scope mismatch' },
      404: { description: 'Project, deliverable, or task not found' }
    }
  },

  uploadScopedTaskImages: {
    tags: ['images'],
    summary: 'Upload task images (project scoped)',
    description: 'Uploads one or more task-owned images scoped by project + deliverable + task.',
    params: scopedProjectDeliverableTaskParams,
    body: imageUploadBody,
    response: {
      201: {
        description: 'Task images uploaded',
        ...uploadResponseSchema
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Task/deliverable scope mismatch' },
      404: { description: 'Project, deliverable, or task not found' }
    }
  },

  deleteScopedTaskImage: {
    tags: ['images'],
    summary: 'Delete task image (project scoped)',
    description: 'Deletes a task-owned image scoped by project + deliverable + task.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'taskId', 'imageId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' },
        taskId: { type: 'string', pattern: '^\\d+$' },
        imageId: { type: 'string', pattern: '^\\d+$' }
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
      401: { description: 'Unauthorized' },
      403: { description: 'Image/task scope mismatch' },
      404: { description: 'Project, deliverable, task, or image not found' }
    }
  },

  getScopedDeliverableImages: {
    tags: ['images'],
    summary: 'List deliverable images (project scoped)',
    description: 'Returns image metadata for images attached directly to a deliverable.',
    params: scopedProjectDeliverableParams,
    response: {
      200: {
        description: 'Deliverable image metadata list',
        type: 'array',
        items: imageMetadataSchema
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Deliverable does not belong to project' },
      404: { description: 'Project or deliverable not found' }
    }
  },

  uploadScopedDeliverableImages: {
    tags: ['images'],
    summary: 'Upload deliverable images (project scoped)',
    description: 'Uploads one or more deliverable-owned images scoped by project + deliverable.',
    params: scopedProjectDeliverableParams,
    body: imageUploadBody,
    response: {
      201: {
        description: 'Deliverable images uploaded',
        ...uploadResponseSchema
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Deliverable does not belong to project' },
      404: { description: 'Project or deliverable not found' }
    }
  },

  deleteScopedDeliverableImage: {
    tags: ['images'],
    summary: 'Delete deliverable image (project scoped)',
    description: 'Deletes a deliverable-owned image scoped by project + deliverable.',
    params: {
      type: 'object',
      required: ['code', 'delivId', 'imageId'],
      properties: {
        code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        delivId: { type: 'string', pattern: '^\\d+$' },
        imageId: { type: 'string', pattern: '^\\d+$' }
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
      401: { description: 'Unauthorized' },
      403: { description: 'Image/deliverable scope mismatch' },
      404: { description: 'Project, deliverable, or image not found' }
    }
  },

  getScopedImageById: {
    tags: ['images'],
    summary: 'Get image binary (project scoped)',
    description: 'Returns image binary for an image that belongs to the specified project.',
    params: scopedImageIdParams,
    response: {
      200: { description: 'Image binary' },
      401: { description: 'Unauthorized' },
      403: { description: 'Image belongs to a different project' },
      404: { description: 'Project or image not found' }
    }
  },

  getScopedImageMetadata: {
    tags: ['images'],
    summary: 'Get image metadata (project scoped)',
    description: 'Returns image metadata for an image that belongs to the specified project.',
    params: scopedImageIdParams,
    response: {
      200: {
        description: 'Image metadata',
        ...imageMetadataSchema
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Image belongs to a different project' },
      404: { description: 'Project or image not found' }
    }
  }
};
