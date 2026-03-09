/**
 * Agent token management route schemas.
 */

const projectCodeParam = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
  },
};

const userAgentTokensParams = {
  type: 'object',
  required: ['code', 'userId'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
    userId: {
      type: 'string',
      pattern: '^(me|\\d+)$',
      description: 'Use "me" for the current user or a numeric user id.',
    },
  },
};

const deleteAgentTokenParams = {
  type: 'object',
  required: ['code', 'userId', 'id'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z0-9_]+$', description: 'Project code (e.g. ZAZZ).' },
    userId: {
      type: 'string',
      pattern: '^(me|\\d+)$',
      description: 'Use "me" for the current user or a numeric user id.',
    },
    id: { type: 'string', pattern: '^\\d+$', description: 'Numeric agent token id.' },
  },
};

const agentTokenItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Numeric agent token id.' },
    token: {
      type: 'string',
      pattern: '^[0-9a-fA-F-]{36}$',
      description: 'Full UUID token value. Visible to authorized human users.',
    },
    label: {
      type: 'string',
      nullable: true,
      description: 'Optional human-readable label for the token.',
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const userTokensSchema = {
  type: 'object',
  properties: {
    userId: { type: 'integer' },
    userName: { type: 'string' },
    userEmail: { type: 'string', format: 'email' },
    tokens: { type: 'array', items: agentTokenItemSchema },
  },
};

export const agentTokenSchemas = {
  getUserAgentTokens: {
    tags: ['agent-tokens'],
    summary: 'List agent tokens for one user in a project',
    description:
      'Human user token only. Use userId="me" for the current user, or a numeric user id when the caller is the project leader.',
    params: userAgentTokensParams,
    response: {
      200: { description: 'Agent tokens for one user', ...userTokensSchema },
    },
  },

  getProjectAgentTokens: {
    tags: ['agent-tokens'],
    summary: 'List all agent tokens for a project',
    description:
      'Human user token only. Project leader view that returns one user row per project user with nested token rows.',
    params: projectCodeParam,
    response: {
      200: {
        description: 'Project agent token tree',
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: userTokensSchema,
          },
        },
      },
    },
  },

  createAgentToken: {
    tags: ['agent-tokens'],
    summary: 'Create an agent token for a project user',
    description:
      'Human user token only. Creates a new UUID token for the project/user pair. userId may be "me" or a numeric user id for project leaders.',
    params: userAgentTokensParams,
    body: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Optional label such as "For all agents access token".',
        },
      },
      additionalProperties: false,
    },
    response: {
      201: { description: 'Agent token created', ...agentTokenItemSchema },
    },
  },

  deleteAgentToken: {
    tags: ['agent-tokens'],
    summary: 'Delete an agent token',
    description:
      'Human user token only. Hard-deletes the token row so the credential becomes invalid immediately.',
    params: deleteAgentTokenParams,
    response: {
      200: {
        description: 'Agent token revoked',
        type: 'object',
        properties: {
          message: { type: 'string', enum: ['Token revoked'] },
        },
      },
    },
  },
};
