// src/providers/chatgpt.js
import { BaseProvider } from './base.js';

export class ChatGPTProvider extends BaseProvider {
  constructor() {
    super('chatgpt', 'https://chatgpt.com');
    this.initialized = false;
  }

  async isLoggedIn() {
    await this.page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    return this.page.url().includes('chatgpt.com') &&
      !this.page.url().includes('auth');
  }

  async sendPrompt(prompt) {
    if (!this.initialized) {
      await this.page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      this.initialized = true;
    } else {
      await this.page.locator('a[href="/"]').first().click().catch(() => { });
      await this.page.waitForTimeout(1500);
    }

    const inputSel = '#prompt-textarea';
    await this.page.waitForSelector(inputSel, { timeout: 15000 });
    await this.page.click(inputSel);
    await this.page.fill(inputSel, prompt);
    await this.page.keyboard.press('Enter');

    const responseSel = 'div.markdown';
    await this.page.waitForSelector(responseSel, { timeout: 30000 });

    await this.page.waitForFunction(() => {
      return !document.querySelector('button[data-testid="stop-button"]');
    }, { timeout: 120000 });

    const blocks = await this.page.locator('div.markdown').all();
    const last = blocks[blocks.length - 1];
    return await last.innerText();
  }
}
