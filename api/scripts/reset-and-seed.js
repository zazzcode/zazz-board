import { db } from '../lib/db/index.js';
import { sql } from 'drizzle-orm';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabaseSnapshot } from './seeders/seedDatabaseSnapshot.js';

async function resetAndSeed() {
  try {
    console.log('🗑️  Resetting database...');
    console.log('');

    console.log('📋 Step 1: Dropping and recreating tables...');
    await db.execute(sql`DROP TABLE IF EXISTS "IMAGE_DATA" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "IMAGE_METADATA" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASK_RELATIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "FILE_LOCKS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASK_TAGS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASKS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "DELIVERABLES" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "AGENT_TOKENS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "PROJECTS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TAGS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TRANSLATIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "COORDINATION_TYPES" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "STATUS_DEFINITIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "USERS" CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS task_relation_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS graph_layout_direction CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS deliverable_type CASCADE`);

    const { execSync } = await import('child_process');
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const apiDir = resolve(scriptDir, '..');
    const localDrizzleKit = resolve(apiDir, 'node_modules/.bin/drizzle-kit');
    const rootDrizzleKit = resolve(apiDir, '../node_modules/.bin/drizzle-kit');
    const drizzleKitBin = existsSync(localDrizzleKit) ? localDrizzleKit : rootDrizzleKit;
    execSync(`${drizzleKitBin} push --force`, { stdio: 'inherit', cwd: apiDir });
    console.log('  ✅ All tables recreated with latest schema');
    console.log('');

    console.log('🌱 Seeding fresh data...');
    console.log('');
    const counts = await seedDatabaseSnapshot();
    console.log('');

    console.log('✅ Database reset and seeding completed successfully!');
    console.log('📊 Summary:');
    Object.entries(counts).forEach(([key, count]) => {
      console.log(`   • ${key}: ${count}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting and seeding data:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

resetAndSeed();
