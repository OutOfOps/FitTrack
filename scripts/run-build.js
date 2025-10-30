#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const cwd = path.join(__dirname, '..', 'fittrack-ua');

const result = spawnSync('npm', ['run', 'build', '--', ...args], {
  cwd,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
