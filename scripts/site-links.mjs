import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteLinks = JSON.parse(await fs.readFile(path.join(root, 'automation/site-links.json'), 'utf8'));

if (siteLinks.soamLinkUrl !== 'https://link.soam-creative.com/') {
  throw new Error('automation/site-links.json の soamLinkUrl は https://link.soam-creative.com/ にしてください。');
}

export const SOAM_LINK_URL = siteLinks.soamLinkUrl;
