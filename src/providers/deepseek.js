// src/providers/deepseek.js
import { BaseProvider } from './base.js';
import fs from 'fs';

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

  async dumpPageStructure() {
    const structure = await this.page.evaluate(() => {
      function dumpNode(el, depth = 0) {
        if (depth > 6) return '';
        const indent = '  '.repeat(depth);
        const tag = el.tagName?.toLowerCase() || '';
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().replace(/\s+/g, '.') : '';
        const role = el.getAttribute?.('role') || '';
        const label = el.getAttribute?.('aria-label') || '';
        const placeholder = el.getAttribute?.('placeholder') || '';
        const text = el.childElementCount === 0
          ? el.textContent?.trim().slice(0, 60) : '';
        const attrs = [role && `role="${role}"`, label && `aria-label="${label}"`,
        placeholder && `placeholder="${placeholder}"`].filter(Boolean).join(' ');
        let line = `${indent}<${tag}${id}${classes}${attrs ? ' ' + attrs : ''}>${text ? ' "' + text + '"' : ''}\n`;
        for (const child of el.children) {
          line += dumpNode(child, depth + 1);
        }
        return line;
      }
      return dumpNode(document.body);
    });
    fs.writeFileSync('deepseek-structure.txt', structure);
    console.log('  [deepseek] 📄 Page structure dumped to deepseek-structure.txt');
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
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+v' : 'Control+v');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Enter');
    console.log(`  [deepseek] 📋 Prompt injected: ${Date.now() - t2}ms`);

    await this.page.waitForFunction(() => {
      const ta = document.querySelector('textarea#chat-input, textarea[placeholder]');
      return ta && ta.value === '';
    }, { timeout: 10000 }).catch(() => { });

    await this.page.waitForTimeout(1000);
    const t3 = Date.now();
    await this.waitForStableText('.ds-markdown');
    console.log(`  [deepseek] ⏹️  Generation done: ${Date.now() - t3}ms`);

    // Dump full page structure after response
    await this.dumpPageStructure();

    const t4 = Date.now();
    const blocks = await this.page.locator('.ds-markdown').all();
    const last = blocks[blocks.length - 1];
    const text = await last.innerText();
    console.log(`  [deepseek] 📝 Text extracted: ${Date.now() - t4}ms`);
    console.log(`  [deepseek] ✅ Total provider time: ${Date.now() - t0}ms`);
    return text;
  }
}