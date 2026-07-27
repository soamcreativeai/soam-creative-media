#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOAM_LINK_URL } from './site-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supported = new Set(['.html', '.md', '.json', '.js', '.mjs', '.yml', '.yaml', '.txt']);
const ignored = new Set(['.git', 'dist', 'node_modules', '.wrangler']);
const oldUrl = /https?:\/\/(?:mimi-to-rami\.com\/soam-link(?:\.html)?|soam-creative\.com\/business\/soam-link|soamcreativeai\.github\.io\/[^\s"'<>]*soam-link[^\s"'<>]*|link\.soam-creative\.com\/?)(?:\?[^\s"'<>]*)?/gi;

const files = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : files(file);
    return supported.has(path.extname(entry.name)) ? [file] : [];
  }));
  return nested.flat();
};

let changed = 0;
for (const file of await files(root)) {
  const original = await fs.readFile(file, 'utf8');
  const normalized = original.replace(oldUrl, SOAM_LINK_URL);
  if (normalized !== original) {
    await fs.writeFile(file, normalized);
    changed += 1;
  }
}
console.log(`[site-links] normalized SOAM Link destinations in ${changed} file(s).`);
