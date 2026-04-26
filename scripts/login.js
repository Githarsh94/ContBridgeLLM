// scripts/login.js
// Usage: node scripts/login.js <provider>
// Example: node scripts/login.js chatgpt

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.resolve(__dirname, '../sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const PROVIDER_URLS = {
  chatgpt: 'https://chatgpt.com',
  gemini: 'https://gemini.google.com',
  deepseek: 'https://chat.deepseek.com',
  claude: 'https://claude.ai',
};

const provider = process.argv[2];

if (!provider || !PROVIDER_URLS[provider]) {
  console.error(`Usage: node scripts/login.js <provider>`);
  console.error(`Available: ${Object.keys(PROVIDER_URLS).join(', ')}`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

(async () => {
  console.log(`\n🔐 Opening browser for: ${provider}`);
  console.log(`   → Log in manually, then come back here and press Enter.\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(PROVIDER_URLS[provider]);

  await ask('✅ Logged in? Press Enter to save session...');

  const sessionPath = path.join(SESSIONS_DIR, `${provider}.json`);
  await context.storageState({ path: sessionPath });

  console.log(`💾 Session saved to: ${sessionPath}`);
  await browser.close();
  rl.close();
})();
