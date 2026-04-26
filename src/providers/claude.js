// src/providers/claude.js
import { BaseProvider } from './base.js';

export class ClaudeProvider extends BaseProvider {
  constructor() {
    super('claude', 'https://claude.ai');
    this.initialized = false;
  }

  async isLoggedIn() {
    await this.page.goto('https://claude.ai', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    return !this.page.url().includes('login');
  }

  async sendPrompt(prompt) {
    if (!this.initialized) {
      await this.page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      this.initialized = true;
    } else {
      await this.page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(1500);
    }

    const inputSel = 'div[contenteditable="true"].ProseMirror';
    await this.page.waitForSelector(inputSel, { timeout: 15000 });
    await this.page.click(inputSel);

    await this.page.evaluate((text) => navigator.clipboard.writeText(text), prompt);
    await this.page.keyboard.press('Control+v');
    await this.page.waitForTimeout(300);

    await this.page.keyboard.press('Enter');

    const responseSel = 'div.font-claude-message';
    await this.page.waitForSelector(responseSel, { timeout: 30000 });

    await this.page.waitForFunction(() => {
      return !document.querySelector('button[aria-label="Stop"]');
    }, { timeout: 120000 }).catch(() => { });

    await this.page.waitForTimeout(1000);

    const blocks = await this.page.locator('div.font-claude-message').all();
    const last = blocks[blocks.length - 1];
    return await last.innerText();
  }
}
