/**
 * Core route schemas (health, root, db-test, token-info).
 */

export const coreSchemas = {
  getHealth: {
    tags: ['core'],
    summary: 'Health check',
    description: 'Returns API health and token cache stats. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'API is healthy',
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          auth: {
            type: 'object',
            properties: {
              tokenCacheInitialized: { type: 'boolean' },
              userCount: { type: 'number' }
            }
          }
        }
      }
    }
  },

  getRoot: {
    tags: ['core'],
    summary: 'API info',
    description: 'Returns API message and endpoint list. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'API info',
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          endpoints: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },

  getDbTest: {
    tags: ['core'],
    summary: 'Database connectivity test',
    description: 'Tests database connection. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'Database connected',
        type: 'object',
        properties: {
          status: { type: 'string' },
          result: {}
        }
      },
      500: {
        description: 'Database connection failed',
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' }
        }
      }
    }
  },

  getTokenInfo: {
    tags: ['core'],
    summary: 'Token cache debug',
    description: 'Returns token cache stats for debugging. No authentication required.',
    security: [],
    response: {
      200: {
        description: 'Token cache info',
        type: 'object',
        properties: {
          cacheInitialized: { type: 'boolean' },
          userCount: { type: 'number' },
          hasTokens: { type: 'boolean' }
        }
      }
    }
  }
};
