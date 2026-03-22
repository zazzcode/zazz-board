#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const stagedFiles = [...new Set(process.argv.slice(2))];

const apiFiles = stagedFiles
  .filter((file) => /^api\/.+\.(js|mjs)$/.test(file))
  .map((file) => file.slice('api/'.length));

const clientFiles = stagedFiles
  .filter((file) => /^client\/.+\.(js|jsx)$/.test(file))
  .map((file) => file.slice('client/'.length));

const markdownFiles = stagedFiles.filter((file) => file.endsWith('.md'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (apiFiles.length > 0) {
  run('npm', ['exec', '--workspace=api', '--', 'eslint', '--no-warn-ignored', ...apiFiles]);
}

if (clientFiles.length > 0) {
  run('npm', ['exec', '--', 'eslint', '--no-warn-ignored', ...clientFiles], {
    cwd: 'client',
  });
}

if (markdownFiles.length > 0) {
  run('npm', ['exec', '--', 'markdownlint-cli2', ...markdownFiles]);
}
