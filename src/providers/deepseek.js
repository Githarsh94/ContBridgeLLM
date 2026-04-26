// src/providers/deepseek.js
import { BaseProvider } from './base.js';

export class DeepSeekProvider extends BaseProvider {
  constructor() {
    super('deepseek', 'https://chat.deepseek.com');
    this.initialized = false;
  }

  async isLoggedIn() {
    await this.page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    return !this.page.url().includes('login');
  }

  async sendPrompt(prompt) {
    if (!this.initialized) {
      await this.page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      this.initialized = true;
    } else {
      await this.page.locator('button[class*="new"], a[href="/"]').first().click().catch(() => { });
      await this.page.waitForTimeout(1500);
    }

    const inputSel = 'textarea#chat-input, textarea[placeholder]';
    await this.page.waitForSelector(inputSel, { timeout: 15000 });
    await this.page.click(inputSel);
    await this.page.fill(inputSel, prompt);
    await this.page.keyboard.press('Enter');

    const responseSel = '.ds-markdown';
    await this.page.waitForSelector(responseSel, { timeout: 30000 });

    await this.page.waitForFunction(() => {
      return !document.querySelector('div[class*="stop"]');
    }, { timeout: 120000 }).catch(() => { });

    await this.page.waitForTimeout(1000);

    const blocks = await this.page.locator('.ds-markdown').all();
    const last = blocks[blocks.length - 1];
    return await last.innerText();
  }
}
