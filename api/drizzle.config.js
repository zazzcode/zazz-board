import { resolveDatabaseUrl } from './lib/db/connectionOptions.js';

// DDL URL selection: drizzle-kit push/generate must use the direct
// (unpooled) endpoint when running against Neon — DDL through the pooled
// PgBouncer endpoint can fail. Under NODE_ENV=test the config always
// targets DATABASE_URL_TEST so test-suite schema pushes can never reach a
// remote database, even if DATABASE_URL_UNPOOLED is set in the environment.
const url =
  process.env.NODE_ENV === 'test'
    ? resolveDatabaseUrl()
    : process.env.DATABASE_URL_UNPOOLED || resolveDatabaseUrl();
if (!url) {
  throw new Error(
    'DATABASE_URL_TEST not set. Tests require explicit test database configuration.\n' +
    'Add DATABASE_URL_TEST to your .env file'
  );
}

export default {
  schema: './lib/db/schema.js',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
};
