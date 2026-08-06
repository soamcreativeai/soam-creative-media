#!/usr/bin/env node

import { cp, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'soam-media-generated-publication-'));
const ignored = new Set(['.git', 'dist', 'node_modules']);

try {
  await cp(root, fixture, {
    recursive: true,
    filter: (source) => !source.split(path.sep).some((part) => ignored.has(part))
  });
  const run = (script, args = []) => execFileSync(process.execPath, [script, ...args], { cwd: fixture, stdio: 'inherit' });

  // 外部AIを呼ばないfixtureで、次に公開する広告記事を実際と同じ順に通す。
  run('scripts/generate-media-article.mjs', ['--fixture', '--slot=morning', '--now=2026-08-10T07:02:00+09:00']);
  run('scripts/normalize-soam-link-urls.mjs');
  run('scripts/apply-media-seo.mjs');
  run('scripts/generate-sitemap.mjs');
  run('scripts/test-site-links.mjs');
  run('scripts/test-media-seo.mjs');
  run('scripts/test-media-strategy.mjs');
  console.log('[generated-media-publication:test] passed');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
