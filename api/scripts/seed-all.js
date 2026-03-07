import { seedUsers } from './seeders/seedUsers.js';
import { seedStatusDefinitions } from './seeders/seedStatusDefinitions.js';
import { seedCoordinationTypes } from './seeders/seedCoordinationTypes.js';
import { seedTranslations } from './seeders/seedTranslations.js';
import { seedProjects } from './seeders/seedProjects.js';
import { seedDeliverables } from './seeders/seedDeliverables.js';
import { seedTags } from './seeders/seedTags.js';
import { seedTasks } from './seeders/seedTasks.js';
import { seedTaskTags } from './seeders/seedTaskTags.js';
import { seedTaskRelations } from './seeders/seedTaskRelations.js';
import { client } from '../lib/db/index.js';

// Safety check: Prevent seeding production
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed production database\n' +
    '   NODE_ENV=production detected\n' +
    '   Set ALLOW_PRODUCTION_SEED=true only for trusted first-run bootstrap\n'
  );
  process.exit(1);
}

// Safety check: Validate database name
const dbUrl = process.env.DATABASE_URL || '';
const dbName = dbUrl.split('/').pop()?.split('?')[0];

const allowedDatabases = ['zazz_board_db', 'zazz_board_dev', 'zazz_board_test'];
if (!allowedDatabases.includes(dbName)) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed this database\n' +
    `   Current database: ${dbName}\n` +
    `   Allowed: ${allowedDatabases.join(', ')}\n`
  );
  process.exit(1);
}

console.log(`✅ Safety check passed. Seeding database: ${dbName}`);

async function seedAll() {
  try {
    console.log('🌱 Seeding database data in correct order...');
    console.log('');

    // Step 1: Seed independent tables first (no foreign keys)
    console.log('📋 Step 1: Seeding base entities...');
    await seedUsers();
    await seedStatusDefinitions();
    await seedCoordinationTypes();
    await seedTranslations();
    await seedTags();
    console.log('');

    // Step 2: Seed tables that depend on users
    console.log('📋 Step 2: Seeding projects (depends on users)...');
    await seedProjects();
    console.log('');

    // Step 3: Seed deliverables (depends on projects and users)
    console.log('📋 Step 3: Seeding deliverables (depends on projects and users)...');
    await seedDeliverables();
    console.log('');

    // Step 4: Seed tasks (depends on projects, deliverables, and users)
    console.log('📋 Step 4: Seeding tasks (depends on projects, deliverables, and users)...');
    await seedTasks();
    console.log('');

    // Step 5: Seed relationship tables
    console.log('📋 Step 5: Seeding relationships (depends on tasks and tags)...');
    await seedTaskTags();
    console.log('');

    // Step 6: Seed task relations (depends on tasks existing)
    console.log('📋 Step 6: Seeding task relations (depends on tasks)...');
    await seedTaskRelations();
    console.log('');

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   • 5 users created');
    console.log('   • 8 status definitions created');
    console.log('   • 4 translation sets created (en, es, fr, de)');
    console.log('   • 2 projects created (ZAZZ, ZED_MER)');
    console.log('   • 4 deliverables created (ZAZZ only)');
    console.log('   • 6 tags created');
    console.log('   • 32 ZAZZ tasks seeded from database snapshot');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error('🔍 Full error:', error);
    await client.end();
    process.exit(1);
  } finally {
    // Close database connection
    await client.end();
  }
}

seedAll();

