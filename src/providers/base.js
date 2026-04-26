// src/providers/base.js
export class BaseProvider {
  constructor(name, url) {
    this.name = name;
    this.url = url;
    this.page = null;
  }

  async init(browser, sessionPath) {
    // Each provider gets its own browser context with saved session
    const context = await browser.newContext({
      storageState: sessionPath,
    });
    this.page = await context.newPage();
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
  }

  // Override in subclasses
  async sendPrompt(prompt) {
    throw new Error(`sendPrompt not implemented for ${this.name}`);
  }

  async isLoggedIn() {
    throw new Error(`isLoggedIn not implemented for ${this.name}`);
  }

  // Helper: wait until text stops changing (streaming done)
  async waitForStableText(selector, { interval = 800, timeout = 120000 } = {}) {
    const start = Date.now();
    let last = '';
    while (Date.now() - start < timeout) {
      await this.page.waitForTimeout(interval);
      const current = await this.page.locator(selector).last().innerText().catch(() => '');
      if (current && current === last && current.length > 0) return current;
      last = current;
    }
    throw new Error(`Timeout waiting for stable response on ${this.name}`);
  }
}
