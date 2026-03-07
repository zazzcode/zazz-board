import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const snapshotPath = resolve(__dirname, 'data/zazz-project-snapshot.json');

let cachedSnapshot = null;

export async function loadZazzProjectSnapshot() {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const raw = await readFile(snapshotPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed?.project || parsed.project.code !== 'ZAZZ') {
    throw new Error('Invalid ZAZZ snapshot data: missing project or unexpected project code');
  }

  parsed.deliverables = Array.isArray(parsed.deliverables) ? parsed.deliverables : [];
  parsed.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  parsed.task_tags = Array.isArray(parsed.task_tags) ? parsed.task_tags : [];
  parsed.task_relations = Array.isArray(parsed.task_relations) ? parsed.task_relations : [];

  cachedSnapshot = parsed;
  return cachedSnapshot;
}
