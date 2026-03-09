import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { db, client } from '../lib/db/index.js';
import {
  USERS,
  STATUS_DEFINITIONS,
  COORDINATION_TYPES,
  TRANSLATIONS,
  TAGS,
  PROJECTS,
  AGENT_TOKENS,
  DELIVERABLES,
  TASKS,
  TASK_TAGS,
  TASK_RELATIONS,
  IMAGE_METADATA,
  IMAGE_DATA,
} from '../lib/db/schema.js';
import { databaseSnapshotPath } from './seeders/databaseSnapshot.js';

const outputPath = process.argv[2] ? resolve(process.argv[2]) : databaseSnapshotPath;

const tableConfig = [
  { key: 'users', table: USERS, sortBy: ['id'] },
  { key: 'status_definitions', table: STATUS_DEFINITIONS, sortBy: ['code'] },
  { key: 'coordination_types', table: COORDINATION_TYPES, sortBy: ['code'] },
  { key: 'translations', table: TRANSLATIONS, sortBy: ['language_code', 'id'] },
  { key: 'tags', table: TAGS, sortBy: ['tag'] },
  { key: 'projects', table: PROJECTS, sortBy: ['id'] },
  { key: 'agent_tokens', table: AGENT_TOKENS, sortBy: ['id'] },
  { key: 'deliverables', table: DELIVERABLES, sortBy: ['id'] },
  { key: 'tasks', table: TASKS, sortBy: ['id'] },
  { key: 'task_tags', table: TASK_TAGS, sortBy: ['task_id', 'tag'] },
  { key: 'task_relations', table: TASK_RELATIONS, sortBy: ['task_id', 'related_task_id', 'relation_type'] },
  { key: 'image_metadata', table: IMAGE_METADATA, sortBy: ['id'] },
  { key: 'image_data', table: IMAGE_DATA, sortBy: ['id'] },
];

function compareValues(left, right) {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function sortRows(rows, sortBy) {
  return [...rows].sort((left, right) => {
    for (const field of sortBy) {
      const comparison = compareValues(left[field], right[field]);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });
}

function isMissingRelationError(error) {
  return error?.cause?.code === '42P01' || error?.code === '42P01';
}

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [key, normalizeValue(innerValue)])
    );
  }

  return value;
}

async function selectRows(key, table, sortBy) {
  try {
    const rows = await db.select().from(table);
    return sortRows(rows, sortBy).map((row) => normalizeValue(row));
  } catch (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }
}

async function exportSnapshot() {
  try {
    const snapshot = {
      format_version: 1,
      metadata: {
        exported_at: new Date().toISOString(),
        missing_tables: [],
      },
    };

    for (const entry of tableConfig) {
      snapshot[entry.key] = await selectRows(entry.key, entry.table, entry.sortBy);
      if (snapshot[entry.key].length === 0) {
        try {
          await db.select().from(entry.table).limit(1);
        } catch (error) {
          if (isMissingRelationError(error)) {
            snapshot.metadata.missing_tables.push(entry.key);
          } else {
            throw error;
          }
        }
      }
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

    console.log(`✅ Exported database snapshot to ${outputPath}`);
    console.log('📊 Row counts:');
    for (const entry of tableConfig) {
      console.log(`   • ${entry.key}: ${snapshot[entry.key].length}`);
    }
    if (snapshot.metadata.missing_tables.length) {
      console.log(`   • missing_tables: ${snapshot.metadata.missing_tables.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Failed to export database snapshot:', error.message);
    console.error('🔍 Full error:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

exportSnapshot();
