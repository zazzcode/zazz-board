/**
 * Logger utility with configurable log levels
 * 
 * Log levels (in order of verbosity):
 * - ERROR: Only errors
 * - WARN: Errors and warnings
 * - INFO: Errors, warnings, and important info (default)
 * - DEBUG: All messages
 * 
 * Set via VITE_LOG_LEVEL environment variable
 * Examples: VITE_LOG_LEVEL=debug, VITE_LOG_LEVEL=warn, VITE_LOG_LEVEL=error
 */

const LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Default to INFO in production, DEBUG in development
const defaultLevel = import.meta.env.DEV ? 'DEBUG' : 'INFO';
const configuredLevel = import.meta.env.VITE_LOG_LEVEL || defaultLevel;
const currentLevel = LEVELS[configuredLevel.toUpperCase()] ?? LEVELS.INFO;

const logger = {
  error: (message, ...args) => {
    if (currentLevel >= LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  warn: (message, ...args) => {
    if (currentLevel >= LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  info: (message, ...args) => {
    if (currentLevel >= LEVELS.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  debug: (message, ...args) => {
    if (currentLevel >= LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  // Get current log level for debugging
  getLevel: () => configuredLevel,
};

export default logger;
