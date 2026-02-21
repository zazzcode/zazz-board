/**
 * Expected status definitions for testing
 */

export const expectedStatusCodes = [
  'BACKLOG',
  'COMPLETED',
  'DONE',
  'ICEBOX',
  'PENDING',
  'TO_DO',
  'READY',
  'IN_PROGRESS',
  'IN_REVIEW',
  'PLANNING',
  'PROD',
  'QA',
  'READY_FOR_DEPLOY',
  'STAGED',
  'TESTING',
  'UAT',
  'AWAITING_APPROVAL',
];

export const statusDefinitionSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string' },
      description: { type: ['string', 'null'] },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' }
    }
  }
};

export const statusCodePattern = /^[A-Z_]+$/;
