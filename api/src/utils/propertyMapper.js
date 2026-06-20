/**
 * Property Mapper Utility
 * Handles conversion between snake_case (database) and camelCase (API) formats
 *
 * @typedef {import('../types.js').PlainObject} PlainObject
 * @typedef {PlainObject|unknown[]} MappableContainer
 * @typedef {MappableContainer|null|undefined|unknown} MappableValue
 */

/**
 * Convert snake_case string to camelCase
 * @param {string} str - snake_case string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 * @param {string} str - camelCase string
 * @returns {string} snake_case string
 */
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from snake_case to camelCase
 * @param {MappableValue} obj - Object, array, or scalar value to convert.
 * @returns {MappableValue} Object with camelCase keys.
 */
function keysToCamelCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    /** @type {PlainObject} */
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      converted[camelKey] = keysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Convert object keys from camelCase to snake_case
 * @param {MappableValue} obj - Object, array, or scalar value to convert.
 * @returns {MappableValue} Object with snake_case keys.
 */
function keysToSnakeCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    /** @type {PlainObject} */
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      converted[snakeKey] = keysToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

export {
  toCamelCase,
  toSnakeCase,
  keysToCamelCase,
  keysToSnakeCase
};
