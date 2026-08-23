import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { buildConnectionOptions, resolveDatabaseUrl } from './connectionOptions.js';

// For tests, use DATABASE_URL_TEST; otherwise use DATABASE_URL
// This allows developers to point DATABASE_URL at any environment for troubleshooting
// while keeping tests isolated to the test database
const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  throw new Error(
    'DATABASE_URL_TEST not set. Tests require explicit test database configuration.\n' +
    'Add DATABASE_URL_TEST to your .env file'
  );
}

// Create postgres client with provider-aware options (Neon hosts get TLS,
// prepare:false, and bounded pool; local hosts keep default behavior)
const client = postgres(connectionString, buildConnectionOptions(connectionString));

// Create drizzle instance
export const db = drizzle(client);

// Export client for cleanup
export { client };

