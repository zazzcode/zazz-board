import { describe, expect, it } from 'vitest';
import { keysToCamelCase, keysToSnakeCase } from '../../src/utils/propertyMapper.js';

describe('propertyMapper', () => {
  it('converts nested plain objects and arrays between DB and JS key formats', () => {
    expect(keysToCamelCase({
      task_id: 1,
      nested_items: [{ created_at: '2026-06-19' }],
    })).toEqual({
      taskId: 1,
      nestedItems: [{ createdAt: '2026-06-19' }],
    });

    expect(keysToSnakeCase({ taskId: 1 })).toEqual({ task_id: 1 });
  });

  it('passes null and undefined through unchanged', () => {
    expect(keysToCamelCase(null)).toBeNull();
    expect(keysToCamelCase(undefined)).toBeUndefined();
    expect(keysToSnakeCase(null)).toBeNull();
    expect(keysToSnakeCase(undefined)).toBeUndefined();
  });
});
