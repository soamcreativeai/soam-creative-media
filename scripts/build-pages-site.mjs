#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOAM_LINK_URL } from './site-links.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist', 'site');
// 配信対象から外したページ（2026-08-07 Founder判断）。ファイル自体は残すが本番へは出さない。
// - shindan-ai-pro.html：有料予定の「サキのAI課金ジャッジ」。決済導線が無いまま公開されると
//   中身が先に流出する（ページ自身がその旨を警告している）。売る準備ができたら戻す。
// - gas-demo.html / slack-demo.html：B2B営業でも使っていないため。
const publicFiles = [
  '.nojekyll', '404.html', 'ai-tool-lp.html', 'contact.html', 'editorial-policy.html',
  'index.html', 'media-home.css', 'media-home.js', 'media-strategy.css',
  'privacy.html', 'robots.txt', 'saved.html',
  'shindan-ai.html', 'sitemap.xml', 'style.css'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of publicFiles) await cp(join(root, file), join(output, file));
for (const directory of ['articles', 'assets', 'pillars', 'guides']) await cp(join(root, directory), join(output, directory), { recursive: true });
await writeFile(join(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n');
console.log(`[cloudflare-pages] built ${output}`);
console.log(`[cloudflare-pages] SOAM Link destination: ${SOAM_LINK_URL}`);
