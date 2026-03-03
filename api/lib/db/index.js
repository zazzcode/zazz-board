import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// For tests, use DATABASE_URL_TEST; otherwise use DATABASE_URL
// This allows developers to point DATABASE_URL at any environment for troubleshooting
// while keeping tests isolated to the test database
let connectionString;
if (process.env.NODE_ENV === 'test') {
  connectionString = process.env.DATABASE_URL_TEST;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL_TEST not set. Tests require explicit test database configuration.\n' +
      'Add DATABASE_URL_TEST to your .env file'
    );
  }
} else {
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'password';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5433';
  const dbName = process.env.DB_NAME || 'zazz_board_db';
  connectionString = process.env.DATABASE_URL || 
    `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
}

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client);

// Export client for cleanup
export { client };

