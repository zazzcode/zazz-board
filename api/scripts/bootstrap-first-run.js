import { db, client } from '../lib/db/index.js';
import { sql } from 'drizzle-orm';
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, '..');

function runScript(scriptName, extraEnv = {}) {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: apiDir,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function bootstrapIfNeeded() {
  console.log('🔎 Checking database initialization state...');

  try {
    const res = await db.execute(sql`SELECT COUNT(*)::int AS count FROM "USERS"`);
    const rows = res?.rows ?? [];
    const userCount = rows[0]?.count ?? 0;
    console.log(`✅ Database schema found (USERS rows: ${userCount}).`);
    return;
  } catch (error) {
    const pgCode = error?.cause?.code;
    if (pgCode !== '42P01') {
      throw error;
    }
    console.log('🧱 Database schema not found. Running first-time bootstrap...');
  }

  await client.end();

  runScript('db:push');
  runScript('db:seed', { ALLOW_PRODUCTION_SEED: 'true' });

  console.log('✅ First-time database bootstrap complete.');
}

async function main() {
  try {
    await bootstrapIfNeeded();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed database bootstrap:', error);
    process.exit(1);
  }
}

main();
