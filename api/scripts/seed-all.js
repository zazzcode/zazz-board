import { seedDatabaseSnapshot } from './seeders/seedDatabaseSnapshot.js';
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
    console.log('🌱 Seeding database from full snapshot...');
    console.log('');
    const counts = await seedDatabaseSnapshot();
    console.log('');

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    Object.entries(counts).forEach(([key, count]) => {
      console.log(`   • ${key}: ${count}`);
    });
    
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
