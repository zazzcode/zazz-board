// Pure helpers that classify a connection string and derive postgres.js
// client options from it. Neon hosts (*.neon.tech) need TLS, prepared
// statements disabled (PgBouncer transaction mode on the pooled endpoint,
// and compute autosuspend destroys prepared statements), and a bounded pool.
// Local and other hosts keep the driver's default behavior (no options).

/** @param {string} connectionString */
export function getDatabaseHost(connectionString) {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

/** @param {string} connectionString */
export function isNeonHost(connectionString) {
  const host = getDatabaseHost(connectionString);
  return host !== null && host.endsWith('.neon.tech');
}

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** @param {string} connectionString */
export function isLocalDatabaseHost(connectionString) {
  return LOCAL_DB_HOSTS.has(getDatabaseHost(connectionString));
}

/**
 * Resolve the effective database URL for an environment, mirroring
 * api/lib/db/index.js: under NODE_ENV=test only DATABASE_URL_TEST is used;
 * otherwise DATABASE_URL or the DB_* fallback applies.
 * @param {Record<string, string | undefined>} env
 * @returns {string | null} URL, or null when test mode lacks DATABASE_URL_TEST.
 */
export function resolveDatabaseUrl(env = process.env) {
  if (env.NODE_ENV === 'test') return env.DATABASE_URL_TEST || null;
  return (
    env.DATABASE_URL ||
    `postgres://${env.DB_USER || 'postgres'}:${env.DB_PASSWORD || 'password'}@${env.DB_HOST || 'localhost'}:${env.DB_PORT || '5433'}/${env.DB_NAME || 'zazz_board_db'}`
  );
}

/**
 * Build postgres.js client options for a connection URL.
 * Neon URLs get TLS plus a bounded pool; everything else gets today's
 * optionless defaults.
 * @param {string} connectionString
 * @returns {Record<string, any>} postgres.js options (empty for non-neon hosts)
 */
export function buildConnectionOptions(connectionString) {
  if (!isNeonHost(connectionString)) return {};
  return {
    ssl: 'require',
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
  };
}
