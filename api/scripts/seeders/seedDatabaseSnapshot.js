import { db } from '../../lib/db/index.js';
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
} from '../../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import { loadDatabaseSnapshot } from './databaseSnapshot.js';

const dateFieldsByKey = {
  users: ['created_at', 'updated_at'],
  status_definitions: ['created_at', 'updated_at'],
  coordination_types: ['created_at', 'updated_at'],
  translations: ['created_at', 'updated_at'],
  tags: ['created_at'],
  projects: ['created_at', 'updated_at'],
  agent_tokens: ['created_at'],
  deliverables: ['approved_at', 'created_at', 'updated_at'],
  tasks: ['started_at', 'completed_at', 'created_at', 'updated_at'],
  task_relations: ['updated_at'],
  image_metadata: ['created_at'],
};

const insertOrder = [
  { key: 'users', label: 'users', table: USERS },
  { key: 'status_definitions', label: 'status definitions', table: STATUS_DEFINITIONS },
  { key: 'coordination_types', label: 'coordination types', table: COORDINATION_TYPES },
  { key: 'translations', label: 'translations', table: TRANSLATIONS },
  { key: 'tags', label: 'tags', table: TAGS },
  { key: 'projects', label: 'projects', table: PROJECTS },
  { key: 'agent_tokens', label: 'agent tokens', table: AGENT_TOKENS },
  { key: 'deliverables', label: 'deliverables', table: DELIVERABLES },
  { key: 'tasks', label: 'tasks', table: TASKS },
  { key: 'task_tags', label: 'task tags', table: TASK_TAGS },
  { key: 'task_relations', label: 'task relations', table: TASK_RELATIONS },
  { key: 'image_metadata', label: 'image metadata', table: IMAGE_METADATA },
  { key: 'image_data', label: 'image data', table: IMAGE_DATA },
];

const sequenceTables = [
  'USERS',
  'TRANSLATIONS',
  'PROJECTS',
  'AGENT_TOKENS',
  'DELIVERABLES',
  'TASKS',
  'IMAGE_METADATA',
];

function convertDateFields(record, dateFields = []) {
  const converted = { ...record };

  for (const field of dateFields) {
    if (converted[field]) {
      converted[field] = new Date(converted[field]);
    }
  }

  return converted;
}

async function insertSnapshotRows(key, label, table, rows) {
  if (!rows.length) {
    console.log(`  ⏭️  No ${label} in snapshot. Skipping.`);
    return 0;
  }

  const preparedRows = rows.map((row) => convertDateFields(row, dateFieldsByKey[key]));
  await db.insert(table).values(preparedRows);
  console.log(`  ✅ Seeded ${preparedRows.length} ${label}`);
  return preparedRows.length;
}

async function resetSequence(tableName) {
  const query = `
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${tableName}"), 1),
      (SELECT COUNT(*) > 0 FROM "${tableName}")
    );
  `;

  await db.execute(sql.raw(query));
}

export async function seedDatabaseSnapshot() {
  console.log('  📝 Seeding from full database snapshot...');
  const snapshot = await loadDatabaseSnapshot();
  const counts = {};

  for (const entry of insertOrder) {
    counts[entry.key] = await insertSnapshotRows(
      entry.key,
      entry.label,
      entry.table,
      snapshot[entry.key]
    );
  }

  for (const tableName of sequenceTables) {
    await resetSequence(tableName);
  }

  console.log('  ✅ Full database snapshot seeded successfully');
  return counts;
}
