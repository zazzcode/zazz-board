/**
 * Validation schemas — barrel re-export for backward compatibility.
 * All schemas are split into domain files under ./schemas/.
 * @see ./index.js
 */
export {
  idParam,
  codeParam,
  taskIdParam,
  taskResponseSchema,
  deliverableResponseSchema,
  tagNamePattern,
  errorResponseSchema,
  responseSchemas,
  tagSchemas,
  taskSchemas,
  taskGraphSchemas,
  projectSchemas,
  deliverableSchemas,
  userSchemas,
  coreSchemas,
  imageSchemas,
  fileLockSchemas
} from './index.js';
