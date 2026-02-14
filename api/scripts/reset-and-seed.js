import { db } from '../lib/db/index.js';
import { USERS, PROJECTS, TASKS, TAGS, TASK_TAGS, IMAGE_METADATA, IMAGE_DATA, STATUS_DEFINITIONS, TRANSLATIONS, TASK_RELATIONS, COORDINATION_REQUIREMENT_DEFINITIONS } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import { seedUsers } from './seeders/seedUsers.js';
import { seedStatusDefinitions } from './seeders/seedStatusDefinitions.js';
import { seedCoordinationRequirementDefinitions } from './seeders/seedCoordinationRequirementDefinitions.js';
import { seedTranslations } from './seeders/seedTranslations.js';
import { seedProjects } from './seeders/seedProjects.js';
import { seedTags } from './seeders/seedTags.js';
import { seedTasks } from './seeders/seedTasks.js';
import { seedTaskTags } from './seeders/seedTaskTags.js';
import { seedTaskRelations } from './seeders/seedTaskRelations.js';

async function resetAndSeed() {
  try {
    console.log('🗑️  Resetting database...');
    console.log('');

    // Step 1: Drop and recreate all tables to handle schema changes
    console.log('📋 Step 1: Dropping and recreating tables...');
    
    console.log('  🗑️ Dropping tables in dependency order...');
    await db.execute(sql`DROP TABLE IF EXISTS "IMAGE_DATA" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "IMAGE_METADATA" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASK_RELATIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASK_TAGS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TASKS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "PROJECTS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TAGS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "TRANSLATIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "COORDINATION_REQUIREMENT_DEFINITIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "STATUS_DEFINITIONS" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "USERS" CASCADE`);
    // Drop enum types (must be after tables that use them)
    await db.execute(sql`DROP TYPE IF EXISTS task_relation_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS graph_layout_direction CASCADE`);
    
    console.log('  🏗️ Recreating tables with updated schema...');
    // Push the current schema to recreate tables
    const { execSync } = await import('child_process');
    // Use drizzle-kit directly in non-interactive mode
execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    
    console.log('  ✅ All tables recreated with latest schema');
    console.log('');

    // Step 2: Seed fresh data
    console.log('🌱 Seeding fresh data...');
    console.log('');

    // Step 2a: Seed independent tables first (no foreign keys)
    console.log('📋 Step 2a: Seeding base entities...');
    await seedUsers();
    await seedTags();
    await seedStatusDefinitions();
    await seedCoordinationRequirementDefinitions();
    await seedTranslations();
    console.log('');

    // Step 2b: Seed tables that depend on users
    console.log('📋 Step 2b: Seeding projects (depends on users)...');
    await seedProjects();
    console.log('');

    // Step 2c: Seed tables that depend on projects and users
    console.log('📋 Step 2c: Seeding tasks (depends on projects and users)...');
    await seedTasks();
    console.log('');

    // Step 2d: Seed relationship tables
    console.log('📋 Step 2d: Seeding relationships (depends on tasks and tags)...');
    await seedTaskTags();
    console.log('');

    // Step 2e: Seed task relations (depends on tasks existing)
    console.log('📋 Step 2e: Seeding task relations (depends on tasks)...');
    await seedTaskRelations();
    console.log('');

    console.log('✅ Database reset and seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   • 5 users created (including Michael Woytowitz)');
    console.log('   • 5 projects created');
    console.log('   • 10 tags created (with colors)');
    console.log('   • 8 status definitions created');
    console.log('   • 5 coordination requirement definitions created');
    console.log('   • 4 languages translations created');
    console.log('   • 10 tasks created');
    console.log('   • 10 task-tag relationships created');
    console.log('   • 6 task relations created (APIMOD project)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting and seeding data:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

resetAndSeed();
