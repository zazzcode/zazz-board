/**
 * User route schemas.
 */

import { idParam } from './common.js';

export const userSchemas = {
  getCurrentUser: {
    tags: ['users'],
    summary: 'Get authenticated user',
    description: 'Returns the current user based on TB_TOKEN or Bearer token.',
    response: {
      200: {
        description: 'Current user',
        type: 'object',
        properties: {
          id: { type: 'number' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },

  getUsers: {
    tags: ['users'],
    summary: 'List users',
    description: 'Returns all users. Optional search to filter by name/email.',
    querystring: {
      type: 'object',
      properties: {
        search: { type: 'string', minLength: 1, maxLength: 255, description: 'Filter users by name or email.' }
      }
    }
  },

  getUserById: {
    tags: ['users'],
    summary: 'Get user by ID',
    description: 'Returns a single user by numeric id.',
    params: idParam
  },

  createUser: {
    tags: ['users'],
    summary: 'Create user',
    description: 'Creates a new user. Required: username, email, firstName, lastName.',
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 100 },
        lastName: { type: 'string', minLength: 1, maxLength: 100 }
      },
      required: ['username', 'email', 'firstName', 'lastName'],
      additionalProperties: false
    }
  },

  updateUser: {
    tags: ['users'],
    summary: 'Update user',
    description: 'Updates user fields. Send only fields to change.',
    params: idParam,
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 100 },
        lastName: { type: 'string', minLength: 1, maxLength: 100 }
      },
      additionalProperties: false
    }
  },

  deleteUser: {
    tags: ['users'],
    summary: 'Delete user',
    description: 'Deletes a user by numeric id.',
    params: idParam
  }
};
