import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildConnectionOptions, isNeonHost } from '../../lib/db/connectionOptions.js';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const NEON_POOLED_URL =
  'postgresql://user:pw@ep-cool-mud-pooler.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require&channel_binding=require';
const NEON_DIRECT_URL =
  'postgresql://user:pw@ep-cool-mud.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require';
const LOCAL_URL = 'postgres://postgres:password@localhost:5433/zazz_board_db';

// Fixture URLs only — never real credentials.
const FAKE_POOLED_URL = 'postgresql://user:pw@ep-fake-pooler.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require';
const FAKE_UNPOOLED_URL = 'postgresql://user:pw@ep-fake.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require';
const FAKE_TEST_URL = 'postgres://postgres:password@localhost:5433/zazz_board_test';

function readDrizzleUrl(overrides) {
  const env = { ...process.env };
  for (const key of [
    'NODE_ENV',
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'DATABASE_URL_TEST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
  ]) {
    delete env[key];
  }
  Object.assign(env, overrides);
  const result = spawnSync(
    process.execPath,
    ['-e', "import('./drizzle.config.js').then((m) => console.log(m.default.dbCredentials.url))"],
    { cwd: apiDir, encoding: 'utf8', env }
  );
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

describe('postgres.js connection options by provider', () => {
  it('should give neon pooler URLs TLS, no prepared statements, and a bounded pool', () => {
    const opts = buildConnectionOptions(NEON_POOLED_URL);
    expect(opts.ssl).toBeDefined();
    expect(opts.prepare).toBe(false);
    expect(opts.max).toBeLessThanOrEqual(10);
  });

  it('should bound idle and connect timeouts for neon URLs', () => {
    const opts = buildConnectionOptions(NEON_POOLED_URL);
    expect(opts.idle_timeout).toBeGreaterThan(0);
    expect(opts.idle_timeout).toBeLessThanOrEqual(60);
    expect(opts.connect_timeout).toBeGreaterThan(0);
  });

  it('should treat neon direct hosts the same as pooled hosts', () => {
    expect(isNeonHost(NEON_DIRECT_URL)).toBe(true);
    expect(buildConnectionOptions(NEON_DIRECT_URL)).toEqual(buildConnectionOptions(NEON_POOLED_URL));
  });

  it('should keep local URLs on the default (optionless) client behavior', () => {
    expect(buildConnectionOptions(LOCAL_URL)).toEqual({});
  });

  it('should not treat non-neon remote hosts as neon', () => {
    const otherRemote = 'postgres://user:pw@db.example.com:5432/zazz_board_db';
    expect(isNeonHost(otherRemote)).toBe(false);
    expect(buildConnectionOptions(otherRemote)).toEqual({});
  });

  it('should reject lookalike hosts that only end with neon.tech inside a longer suffix', () => {
    expect(isNeonHost('postgres://user:pw@db.neon.tech.example.com/zazz_board_db')).toBe(false);
  });
});

describe('drizzle DDL URL selection', () => {
  it('should prefer the direct (unpooled) endpoint when it is set', () => {
    expect(readDrizzleUrl({ DATABASE_URL_UNPOOLED: FAKE_UNPOOLED_URL, DATABASE_URL: FAKE_POOLED_URL }))
      .toBe(FAKE_UNPOOLED_URL);
  });

  it('should fall back to DATABASE_URL when no unpooled endpoint is set', () => {
    expect(readDrizzleUrl({ DATABASE_URL: FAKE_POOLED_URL })).toBe(FAKE_POOLED_URL);
  });

  it('should stay on the test database under NODE_ENV=test even when an unpooled endpoint is present', () => {
    expect(
      readDrizzleUrl({
        NODE_ENV: 'test',
        DATABASE_URL_TEST: FAKE_TEST_URL,
        DATABASE_URL_UNPOOLED: FAKE_UNPOOLED_URL,
        DATABASE_URL: FAKE_POOLED_URL,
      })
    ).toBe(FAKE_TEST_URL);
  });

  it('should fall back to the DB_* defaults when no URL variables are set', () => {
    expect(readDrizzleUrl({})).toBe('postgres://postgres:password@localhost:5433/zazz_board_db');
  });
});
