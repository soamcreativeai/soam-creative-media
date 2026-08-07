#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slotKey, slots, tokyoParts } from './media-generation-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const value = (name) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const slot = value('--slot');
const now = value('--now') ? new Date(value('--now')) : new Date();

if (!slots[slot]) throw new Error('`--slot=morning|noon|evening` を指定してください。');
if (Number.isNaN(now.getTime())) throw new Error('`--now` は ISO 8601 形式で指定してください。');

const queue = JSON.parse(await fs.readFile(path.join(root, 'automation/article-queue.json'), 'utf8'));
const id = `${slotKey(tokyoParts(now).date, slot)}-auto`;
const alreadyRecorded = queue.articles.some((entry) => entry.id === id);

console.log(`publication_id=${id}`);
console.log(`should_generate=${alreadyRecorded ? 'false' : 'true'}`);
console.error(`[media-publication-slot] ${alreadyRecorded ? 'already recorded; no AI generation or deployment is required.' : 'not yet recorded; generation is permitted.'}`);
