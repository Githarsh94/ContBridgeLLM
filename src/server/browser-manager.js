// src/server/browser-manager.js
import { chromium } from 'playwright';
import { ChatGPTProvider } from '../providers/chatgpt.js';
import { GeminiProvider } from '../providers/gemini.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { ClaudeProvider } from '../providers/claude.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.resolve(__dirname, '../../sessions');

const PROVIDERS = {
  chatgpt: ChatGPTProvider,
  gemini: GeminiProvider,
  deepseek: DeepSeekProvider,
  claude: ClaudeProvider,
};

export class BrowserManager {
  constructor() {
    this.browser = null;
    this.instances = {}; // providerName -> provider instance
    this.queue = {};     // providerName -> serialized promise chain
  }

  sessionPath(name) {
    return path.join(SESSIONS_DIR, `${name}.json`);
  }

  hasSession(name) {
    return fs.existsSync(this.sessionPath(name));
  }

  async launch() {
    this.browser = await chromium.launch({
      headless: false, // Keep visible so CAPTCHA/2FA can be handled
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    console.log('🌐 Browser launched');
  }

  async loadProvider(name) {
    if (this.instances[name]) return this.instances[name];
    if (!this.hasSession(name)) {
      throw new Error(`No session for "${name}". Run: npm run login ${name}`);
    }

    const ProviderClass = PROVIDERS[name];
    if (!ProviderClass) throw new Error(`Unknown provider: ${name}`);

    const provider = new ProviderClass();
    const context = await this.browser.newContext({
      storageState: this.sessionPath(name),
    });
    provider.page = await context.newPage();
    this.instances[name] = provider;
    this.queue[name] = Promise.resolve(); // init queue
    console.log(`✅ Provider loaded: ${name}`);
    return provider;
  }

  // Serialize requests per provider so they don't overlap
  async sendPrompt(providerName, prompt) {
    const provider = await this.loadProvider(providerName);
    return new Promise((resolve, reject) => {
      this.queue[providerName] = this.queue[providerName]
        .then(() => provider.sendPrompt(prompt))
        .then(resolve)
        .catch(reject);
    });
  }

  availableModels() {
    return Object.keys(PROVIDERS).map((id) => ({
      id,
      object: 'model',
      created: 1700000000,
      owned_by: 'llm-bridge',
    }));
  }
}
