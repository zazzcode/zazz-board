import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { evaluateSeedGuard } from '../../scripts/seed-all.js';
import { evaluateResetGuard } from '../../scripts/reset-and-seed.js';
import { isLocalDatabaseHost } from '../../lib/db/connectionOptions.js';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Fixture URLs only — never real credentials.
const LOCAL_DEV_URL = 'postgres://postgres:password@localhost:5433/zazz_board_db';
const LOCAL_IPV4_URL = 'postgres://postgres:password@127.0.0.1:5433/zazz_board_db';
const LOCAL_IPV6_URL = 'postgres://postgres:password@[::1]:5433/zazz_board_db';
const REMOTE_NEON_URL =
  'postgresql://user:pw@ep-fake-pooler.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require';
const REMOTE_OTHER_URL = 'postgres://user:pw@db.example.com:5432/zazz_board_db';

function envWith(overrides = {}) {
  return { DATABASE_URL: LOCAL_DEV_URL, ...overrides };
}

describe('seed-all guard', () => {
  it('should allow a local database with an allowed zazz_board_* name', () => {
    expect(evaluateSeedGuard(envWith())).toEqual({ allowed: true, dbName: 'zazz_board_db' });
  });

  it('should refuse a local database outside the name allowlist', () => {
    const decision = evaluateSeedGuard(
      envWith({ DATABASE_URL: 'postgres://postgres:password@localhost:5433/some_other_db' })
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('some_other_db');
    expect(decision.reason).toContain('zazz_board_db');
  });

  it('should refuse a neon host without ALLOW_REMOTE_SEED', () => {
    const decision = evaluateSeedGuard(envWith({ DATABASE_URL: REMOTE_NEON_URL }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('ALLOW_REMOTE_SEED');
  });

  it('should refuse any non-local host, not only neon hosts, without the opt-in', () => {
    const decision = evaluateSeedGuard(envWith({ DATABASE_URL: REMOTE_OTHER_URL }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('ALLOW_REMOTE_SEED');
  });

  it('should allow a remote host with ALLOW_REMOTE_SEED=true', () => {
    const decision = evaluateSeedGuard(envWith({ DATABASE_URL: REMOTE_NEON_URL, ALLOW_REMOTE_SEED: 'true' }));
    expect(decision).toEqual({ allowed: true, dbName: 'zazz_board_db' });
  });

  it('should refuse a remote host when ALLOW_REMOTE_SEED is set but not true', () => {
    const decision = evaluateSeedGuard(envWith({ DATABASE_URL: REMOTE_NEON_URL, ALLOW_REMOTE_SEED: 'false' }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('ALLOW_REMOTE_SEED');
  });

  it('should keep the production backstop', () => {
    const decision = evaluateSeedGuard(envWith({ NODE_ENV: 'production' }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('ALLOW_PRODUCTION_SEED');
  });

  it('should honor the production bootstrap opt-in for a local database', () => {
    const decision = evaluateSeedGuard(envWith({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' }));
    expect(decision.allowed).toBe(true);
  });
});

describe('reset-and-seed guard', () => {
  it('should allow localhost targets', () => {
    expect(evaluateResetGuard(envWith()).allowed).toBe(true);
  });

  it('should allow 127.0.0.1 and ::1 targets', () => {
    expect(evaluateResetGuard(envWith({ DATABASE_URL: LOCAL_IPV4_URL })).allowed).toBe(true);
    expect(evaluateResetGuard(envWith({ DATABASE_URL: LOCAL_IPV6_URL })).allowed).toBe(true);
  });

  it('should allow the DB_* fallback URL when no DATABASE_URL is set', () => {
    expect(evaluateResetGuard({}).allowed).toBe(true);
  });

  it('should refuse a remote host even with ALLOW_REMOTE_SEED=true', () => {
    const decision = evaluateResetGuard(envWith({ DATABASE_URL: REMOTE_NEON_URL, ALLOW_REMOTE_SEED: 'true' }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('no remote override');
  });

  it('should classify IPv6 loopback URLs as local', () => {
    expect(isLocalDatabaseHost(LOCAL_IPV6_URL)).toBe(true);
  });
});

describe('guard scripts as executed', () => {
  it('should exit non-zero when seed-all targets a remote host without the opt-in', () => {
    const result = spawnSync(process.execPath, ['scripts/seed-all.js'], {
      cwd: apiDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: REMOTE_NEON_URL, ALLOW_REMOTE_SEED: '' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ALLOW_REMOTE_SEED');
  });

  it('should exit non-zero when reset-and-seed targets a remote host', () => {
    const result = spawnSync(process.execPath, ['scripts/reset-and-seed.js'], {
      cwd: apiDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: REMOTE_NEON_URL, ALLOW_REMOTE_SEED: 'true' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Refusing to reset non-local');
  });
});
