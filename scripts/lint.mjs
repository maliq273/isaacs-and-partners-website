#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache', 'reports']);
const extensions = new Set(['.js', '.mjs', '.cjs']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) files.push(file);
  }
}

walk(root);
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push({ file: path.relative(root, file).replaceAll(path.sep, '/'), output: `${result.stdout}${result.stderr}`.trim() });
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`\n${failure.file}\n${failure.output}`);
  process.exit(1);
}

console.log(`JavaScript syntax lint passed: ${files.length} files checked.`);
