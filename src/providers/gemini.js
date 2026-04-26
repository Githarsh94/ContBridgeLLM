// src/providers/gemini.js
import { BaseProvider } from './base.js';

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', 'https://gemini.google.com');
    this.initialized = false;
  }

  async isLoggedIn() {
    await this.page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    return !this.page.url().includes('accounts.google.com');
  }

  async sendPrompt(prompt) {
    const t0 = Date.now();

    if (!this.initialized) {
      await this.page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      this.initialized = true;
      console.log(`  [gemini] 🌐 Initial navigation: ${Date.now() - t0}ms`);
    }

    const inputSel = 'rich-textarea div[contenteditable="true"]';
    const t1 = Date.now();
    await this.page.waitForSelector(inputSel, { timeout: 15000 });
    await this.page.click(inputSel);
    console.log(`  [gemini] ⌨️  Input ready: ${Date.now() - t1}ms`);

    // Count existing responses before sending
    const responseSel = 'message-content .markdown';
    const prevCount = await this.page.locator(responseSel).count();

    const t2 = Date.now();
    await this.page.evaluate((text) => navigator.clipboard.writeText(text), prompt);
    await this.page.keyboard.press('Control+v');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Enter');
    console.log(`  [gemini] 📋 Prompt injected: ${Date.now() - t2}ms`);

    // Wait for a NEW response block to appear (count increases)
    const t3 = Date.now();
    await this.page.waitForFunction(
      ({ sel, prev }) => document.querySelectorAll(sel).length > prev,
      { sel: responseSel, prev: prevCount },
      { timeout: 30000 }
    );
    console.log(`  [gemini] 💬 First token appeared: ${Date.now() - t3}ms`);

    // Wait for stop button to disappear
    const t4 = Date.now();
    await this.page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return !btns.some(b => b.getAttribute('aria-label') === 'Stop response');
    }, { timeout: 120000, polling: 500 }).catch(() => {
      console.log(`  [gemini] ⚠️  Stop detection timed out`);
    });
    console.log(`  [gemini] ⏹️  Generation done: ${Date.now() - t4}ms`);

    await this.page.waitForTimeout(300);

    // Get the latest response block
    const t5 = Date.now();
    const blocks = await this.page.locator(responseSel).all();
    const last = blocks[blocks.length - 1];
    const text = await last.innerText();
    console.log(`  [gemini] 📝 Text extracted: ${Date.now() - t5}ms`);
    console.log(`  [gemini] ✅ Total provider time: ${Date.now() - t0}ms`);
    return text;
  }
}