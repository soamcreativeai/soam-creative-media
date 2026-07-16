import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist', 'site');
const publicFiles = [
  '.nojekyll',
  'ai-tool-lp.html',
  'contact.html',
  'editorial-policy.html',
  'gas-demo.html',
  'index.html',
  'media-home.css',
  'media-home.js',
  'privacy.html',
  'robots.txt',
  'saved.html',
  'shindan-ai-pro.html',
  'shindan-ai.html',
  'sitemap.xml',
  'slack-demo.html',
  'style.css',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of publicFiles) {
  await cp(join(root, file), join(output, file));
}
for (const directory of ['articles', 'assets']) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}
await writeFile(join(output, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n`);

console.log(`Built ${output}`);
