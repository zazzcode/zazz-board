/**
 * Schema index — re-exports all domain schemas and common utilities.
 * Use: import { projectSchemas } from '../schemas/validation.js' (or '../schemas/index.js')
 */

export {
  idParam,
  codeParam,
  taskIdParam,
  taskResponseSchema,
  deliverableResponseSchema,
  tagNamePattern,
  errorResponseSchema,
  responseSchemas
} from './common.js';

export { tagSchemas } from './tags.js';
export { taskSchemas } from './tasks.js';
export { taskGraphSchemas } from './taskGraph.js';
export { projectSchemas } from './projects.js';
export { deliverableSchemas } from './deliverables.js';
export { userSchemas } from './users.js';
export { coreSchemas } from './core.js';
export { imageSchemas } from './images.js';
