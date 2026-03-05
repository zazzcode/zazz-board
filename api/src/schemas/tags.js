/**
 * Tag route schemas.
 */

import { idParam } from './common.js';
import { tagNamePattern } from './common.js';

export const tagSchemas = {
  getTags: {
    tags: ['tags'],
    summary: 'List tags',
    description: 'Returns all tags. Optional search query to filter by name.',
    querystring: {
      type: 'object',
      properties: {
        search: { type: 'string', minLength: 1, maxLength: 100, description: 'Filter tags by name (partial match).' }
      }
    }
  },

  getTagById: {
    tags: ['tags'],
    summary: 'Get tag by ID',
    description: 'Returns a single tag by numeric id.',
    params: idParam
  },

  createTag: {
    tags: ['tags'],
    summary: 'Create tag',
    description: 'Creates a new tag. Name must be lowercase with hyphens (e.g. frontend, bug-fix).',
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: tagNamePattern,
          description: 'Tag name must be lowercase with hyphens as separators. Cannot start or end with hyphen.'
        },
        color: {
          type: 'string',
          pattern: '^#[0-9A-Fa-f]{6}$',
          description: 'Color must be a valid hex color (e.g., #FF5733)'
        }
      },
      required: ['name'],
      additionalProperties: false
    }
  },

  updateTag: {
    tags: ['tags'],
    summary: 'Update tag',
    description: 'Updates tag name and/or color. id is numeric.',
    params: idParam,
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: tagNamePattern,
          description: 'Tag name must be lowercase with hyphens as separators. Cannot start or end with hyphen.'
        },
        color: {
          type: 'string',
          pattern: '^#[0-9A-Fa-f]{6}$',
          description: 'Color must be a valid hex color (e.g., #FF5733)'
        }
      },
      additionalProperties: false
    }
  },

  deleteTag: {
    tags: ['tags'],
    summary: 'Delete tag',
    description: 'Deletes a tag by numeric id. Does not remove tag from tasks.',
    params: idParam
  }
};
