/**
 * Expected project status workflow structures for testing
 */

export const defaultStatusWorkflow = ['TO_DO', 'READY', 'IN_PROGRESS', 'QA', 'COMPLETED'];  // ZAZZ project default workflow

export const allAvailableStatuses = [
  'BACKLOG',
  'COMPLETED',
  'DONE',
  'ICEBOX',
  'TO_DO',
  'READY',
  'IN_PROGRESS', 
  'IN_REVIEW',
  'AWAITING_APPROVAL',
  'PLANNING',
  'PROD',
  'QA',
  'READY_FOR_DEPLOY',
  'STAGED',
  'TESTING',
  'UAT'
];

export const minimalWorkflow = ['TO_DO'];

export const threeStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'];

export const reorderedWorkflow = ['COMPLETED', 'IN_PROGRESS', 'TO_DO'];

export const statusWorkflowSchema = {
  type: 'object',
  required: ['statusWorkflow'],
  properties: {
    statusWorkflow: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};
