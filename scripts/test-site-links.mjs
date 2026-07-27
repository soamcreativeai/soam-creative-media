#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOAM_LINK_URL } from './site-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supported = new Set(['.html', '.md', '.json', '.js', '.mjs', '.yml', '.yaml', '.txt']);
const ignored = new Set(['.git', 'dist', 'node_modules', '.wrangler']);
const forbidden = /https?:\/\/(?:mimi-to-rami\.com\/soam-link(?:\.html)?|soam-creative\.com\/business\/soam-link|soamcreativeai\.github\.io\/[^\s"'<>]*soam-link|link\.soam-creative\.com\/?\?)/i;
const files = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) return ignored.has(entry.name) ? [] : files(file);
  return supported.has(path.extname(entry.name)) ? [file] : [];
  }));
  return nested.flat();
};

const errors = [];
for (const file of await files(root)) {
  const text = await fs.readFile(file, 'utf8');
  if (forbidden.test(text)) errors.push(path.relative(root, file));
}
const home = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const articleIndex = await fs.readFile(path.join(root, 'articles/index.html'), 'utf8');
if (!home.includes(`href="${SOAM_LINK_URL}"`)) errors.push('index.html のSOAM Linkバナー');
if (!articleIndex.includes(`href="${SOAM_LINK_URL}"`)) errors.push('articles/index.html のSOAM Link CTA');
if (errors.length) throw new Error(`古いSOAM Link URLまたは正規URLでない導線があります: ${errors.join(', ')}`);
console.log('[site-links:test] passed (all SOAM Link destinations use https://link.soam-creative.com/)');
