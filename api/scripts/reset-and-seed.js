import { db } from '../lib/db/index.js';
import { sql } from 'drizzle-orm';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { seedUsers } from './seeders/seedUsers.js';
import { seedStatusDefinitions } from './seeders/seedStatusDefinitions.js';
import { seedCoordinationTypes } from './seeders/seedCoordinationTypes.js';
import { seedTranslations } from './seeders/seedTranslations.js';
import { seedProjects } from './seeders/seedProjects.js';
import { seedAgentTokens } from './seeders/seedAgentTokens.js';
import { seedDeliverables } from './seeders/seedDeliverables.js';
import { seedTags } from './seeders/seedTags.js';
import { seedTasks } from './seeders/seedTasks.js';
import { seedTaskTags } from './seeders/seedTaskTags.js';
import { seedTaskRelations } from './seeders/seedTaskRelations.js';

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

    console.log('📋 Step 2a: Seeding base entities...');
    await seedUsers();
    await seedTags();
    await seedStatusDefinitions();
    await seedCoordinationTypes(); // Populates COORDINATION_TYPES table
    await seedTranslations();
    console.log('');

    console.log('📋 Step 2b: Seeding projects...');
    await seedProjects();
    console.log('');

    console.log('📋 Step 2c: Seeding agent tokens...');
    await seedAgentTokens();
    console.log('');

    console.log('📋 Step 2d: Seeding deliverables...');
    await seedDeliverables();
    console.log('');

    console.log('📋 Step 2e: Seeding tasks...');
    await seedTasks();
    console.log('');

    console.log('📋 Step 2f: Seeding task-tag relationships...');
    await seedTaskTags();
    console.log('');

    console.log('📋 Step 2g: Seeding task relations...');
    await seedTaskRelations();
    console.log('');

    console.log('✅ Database reset and seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   • 5 users created');
    console.log('   • 2 projects created (ZAZZ, ZED_MER)');
    console.log('   • 6 agent tokens created');
    console.log('   • 4 deliverables created (ZAZZ only)');
    console.log('   • 32 ZAZZ tasks seeded from database snapshot');
    console.log('   • status definitions + translations seeded');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting and seeding data:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

resetAndSeed();
