#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (...args) => execFileSync(process.execPath, ['scripts/check-media-publication-slot.mjs', ...args], { cwd: root, encoding: 'utf8' });

const recorded = run('--slot=noon', '--now=2026-08-01T12:17:00+09:00');
assert.match(recorded, /publication_id=2026-08-01-noon-auto/);
assert.match(recorded, /should_generate=false/);

const available = run('--slot=morning', '--now=2030-01-01T07:02:00+09:00');
assert.match(available, /publication_id=2030-01-01-morning-auto/);
assert.match(available, /should_generate=true/);

console.log('[media-publication-slot:test] passed (recorded slots skip before paid generation)');
