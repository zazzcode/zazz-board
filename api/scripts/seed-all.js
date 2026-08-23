import { seedDatabaseSnapshot } from './seeders/seedDatabaseSnapshot.js';
import { client } from '../lib/db/index.js';
import { pathToFileURL } from 'url';
import { getDatabaseHost, isLocalDatabaseHost, resolveDatabaseUrl } from '../lib/db/connectionOptions.js';

const ALLOWED_SEED_DATABASES = ['zazz_board_db', 'zazz_board_dev', 'zazz_board_test'];

/**
 * Decide whether seeding is allowed for this environment.
 * Local targets need an allowed zazz_board_* database name; any non-local
 * host additionally requires ALLOW_REMOTE_SEED=true. The NODE_ENV=production
 * block stays as a backstop for first-run bootstrap flows.
 * @param {Record<string, string | undefined>} env
 * @returns {{ allowed: boolean, dbName?: string, reason?: string }}
 */
export function evaluateSeedGuard(env = process.env) {
  if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_SEED !== 'true') {
    return {
      allowed: false,
      reason:
        'Cannot seed production database\n' +
        '   NODE_ENV=production detected\n' +
        '   Set ALLOW_PRODUCTION_SEED=true only for trusted first-run bootstrap',
    };
  }

  const dbUrl = resolveDatabaseUrl(env);
  if (!dbUrl) {
    return {
      allowed: false,
      reason:
        'Cannot seed: no DATABASE_URL_TEST set under NODE_ENV=test\n' +
        '   Add DATABASE_URL_TEST to your .env file',
    };
  }

  const dbName = dbUrl.split('/').pop()?.split('?')[0];
  if (!ALLOWED_SEED_DATABASES.includes(dbName)) {
    return {
      allowed: false,
      reason:
        `Cannot seed this database\n` +
        `   Current database: ${dbName}\n` +
        `   Allowed: ${ALLOWED_SEED_DATABASES.join(', ')}`,
    };
  }

  if (!isLocalDatabaseHost(dbUrl) && env.ALLOW_REMOTE_SEED !== 'true') {
    return {
      allowed: false,
      reason:
        `Cannot seed remote database host: ${getDatabaseHost(dbUrl) ?? dbUrl}\n` +
        '   Set ALLOW_REMOTE_SEED=true to seed a remote database deliberately',
    };
  }

  return { allowed: true, dbName };
}

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

const isMainScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainScript) {
  // Safety check: production backstop, database-name allowlist, remote opt-in
  const decision = evaluateSeedGuard();
  if (!decision.allowed) {
    console.error('\x1b[31m%s\x1b[0m', `\n❌ SAFETY CHECK FAILED: ${decision.reason}\n`);
    process.exit(1);
  }

  console.log(`✅ Safety check passed. Seeding database: ${decision.dbName}`);
  seedAll();
}
