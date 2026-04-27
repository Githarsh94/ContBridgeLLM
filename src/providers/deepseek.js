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
    const t0 = Date.now();

    if (!this.initialized) {
      await this.page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      this.initialized = true;
      console.log(`  [deepseek] 🌐 Initial navigation: ${Date.now() - t0}ms`);
    }

    const inputSel = 'textarea#chat-input, textarea[placeholder]';
    const t1 = Date.now();
    await this.page.waitForSelector(inputSel, { timeout: 15000 });
    await this.page.click(inputSel);
    console.log(`  [deepseek] ⌨️  Input ready: ${Date.now() - t1}ms`);

    const t2 = Date.now();
    await this.page.evaluate((text) => navigator.clipboard.writeText(text), prompt);
    await this.page.keyboard.press('Control+v');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Enter');
    console.log(`  [deepseek] 📋 Prompt injected: ${Date.now() - t2}ms`);

    // Wait for input to empty (means it was submitted)
    await this.page.waitForFunction(() => {
      const ta = document.querySelector('textarea#chat-input, textarea[placeholder]');
      return ta && ta.value === '';
    }, { timeout: 10000 }).catch(() => { });

    // Small pause then wait for response to stabilize
    await this.page.waitForTimeout(1000);
    const t3 = Date.now();
    await this.waitForStableText('.ds-markdown');
    console.log(`  [deepseek] ⏹️  Generation done: ${Date.now() - t3}ms`);

    const t4 = Date.now();
    const blocks = await this.page.locator('.ds-markdown').all();
    const last = blocks[blocks.length - 1];
    const text = await last.innerText();
    console.log(`  [deepseek] 📝 Text extracted: ${Date.now() - t4}ms`);
    console.log(`  [deepseek] ✅ Total provider time: ${Date.now() - t0}ms`);
    return text;
  }
}