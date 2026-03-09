import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const databaseSnapshotPath = resolve(__dirname, 'data/database-snapshot.json');

let cachedSnapshot = null;
let cachedSnapshotPath = null;

function resolveSnapshotPath() {
  return process.env.DB_SNAPSHOT_PATH
    ? resolve(process.cwd(), process.env.DB_SNAPSHOT_PATH)
    : databaseSnapshotPath;
}

function normalizeSnapshot(parsed) {
  const normalized = {
    format_version: parsed?.format_version ?? 1,
    users: Array.isArray(parsed?.users) ? parsed.users : [],
    status_definitions: Array.isArray(parsed?.status_definitions) ? parsed.status_definitions : [],
    coordination_types: Array.isArray(parsed?.coordination_types) ? parsed.coordination_types : [],
    translations: Array.isArray(parsed?.translations) ? parsed.translations : [],
    tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
    projects: Array.isArray(parsed?.projects) ? parsed.projects : [],
    agent_tokens: Array.isArray(parsed?.agent_tokens) ? parsed.agent_tokens : [],
    deliverables: Array.isArray(parsed?.deliverables) ? parsed.deliverables : [],
    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
    task_tags: Array.isArray(parsed?.task_tags) ? parsed.task_tags : [],
    task_relations: Array.isArray(parsed?.task_relations) ? parsed.task_relations : [],
    image_metadata: Array.isArray(parsed?.image_metadata) ? parsed.image_metadata : [],
    image_data: Array.isArray(parsed?.image_data) ? parsed.image_data : [],
  };

  return normalized;
}

export async function loadDatabaseSnapshot() {
  const snapshotPath = resolveSnapshotPath();

  if (cachedSnapshot && cachedSnapshotPath === snapshotPath) {
    return cachedSnapshot;
  }

  const raw = await readFile(snapshotPath, 'utf8');
  const parsed = JSON.parse(raw);
  cachedSnapshot = normalizeSnapshot(parsed);
  cachedSnapshotPath = snapshotPath;
  return cachedSnapshot;
}
