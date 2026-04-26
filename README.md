# LLM Bridge 🌉

A local OpenAI-compatible API server that drives real browser sessions — **no official API keys needed**. Works with the **Continue extension** in VS Code, any OpenAI SDK, and `curl`.

## Supported Providers

| Model ID   | Site                         |
|------------|------------------------------|
| `chatgpt`  | https://chatgpt.com          |
| `gemini`   | https://gemini.google.com    |
| `deepseek` | https://chat.deepseek.com    |
| `claude`   | https://claude.ai            |

---

## Prerequisites

- **Node.js v18+** — https://nodejs.org
- **npm** (comes with Node.js)

---

## Setup

### Step 1 — Install dependencies

```bash
cd llm-bridge
npm install
npx playwright install chromium
```

`npx playwright install chromium` downloads the Chromium browser Playwright will automate (~150 MB, one-time).

### Step 2 — Log in to each provider (one-time)

Opens a real visible browser window — log in manually (including any 2FA), then press **Enter** to save your session.

```bash
node scripts/login.js chatgpt
node scripts/login.js gemini
node scripts/login.js deepseek
node scripts/login.js claude
```

Sessions are saved to `./sessions/<provider>.json`. This folder is gitignored — keep it private, it contains your auth cookies.

> Re-run if your session expires (usually weeks/months).

### Step 3 — Start the server

```bash
npm start
```

Server starts at **`http://localhost:1337`**. A browser window opens in the background — leave it running.

```
🚀 LLM Bridge running at http://localhost:1337
   Models endpoint : http://localhost:1337/v1/models
   Chat endpoint   : http://localhost:1337/v1/chat/completions
```

---

## Using with VS Code — Continue Extension

[Continue](https://continue.dev) is a free VS Code extension with full support for custom OpenAI-compatible endpoints.

### 1. Install the extension

Search `Continue` in the VS Code Extensions panel, or:
```
ext install Continue.continue
```

### 2. Edit `~/.continue/config.yaml`

Open with: `Cmd/Ctrl+Shift+P` → `Continue: Open config.yaml`

```yaml
name: LLM Bridge
version: 1.0.0
schema: v1

models:
  - name: ChatGPT (Bridge)
    provider: openai
    model: chatgpt
    apiBase: http://localhost:1337/v1
    apiKey: llm-bridge
    roles:
      - chat
      - edit

  - name: Gemini (Bridge)
    provider: openai
    model: gemini
    apiBase: http://localhost:1337/v1
    apiKey: llm-bridge
    roles:
      - chat
      - edit

  - name: DeepSeek (Bridge)
    provider: openai
    model: deepseek
    apiBase: http://localhost:1337/v1
    apiKey: llm-bridge
    roles:
      - chat
      - edit

  - name: Claude (Bridge)
    provider: openai
    model: claude
    apiBase: http://localhost:1337/v1
    apiKey: llm-bridge
    roles:
      - chat
      - edit
```

### 3. Select your model

Pick a model from the Continue chat panel (bottom of VS Code) and start chatting.

---

## Test with curl

```bash
# List available models
curl http://localhost:1337/v1/models

# Chat with Gemini
curl -X POST http://localhost:1337/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "What is 2+2?"}]
  }'

# Streaming response
curl -X POST http://localhost:1337/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini", "messages": [{"role":"user","content":"Hi"}], "stream": true}'
```

---

## Architecture

```
VS Code / Continue / curl / any OpenAI SDK
              │
              ▼
      Express Server :1337
      (OpenAI-compatible REST API)
              │
        ┌─────┴──────┐
        ▼            ▼
  BrowserManager   Queue per provider
  ├── chatgpt  → Playwright page → chatgpt.com
  ├── gemini   → Playwright page → gemini.google.com  (persistent chat)
  ├── deepseek → Playwright page → chat.deepseek.com
  └── claude   → Playwright page → claude.ai
```

- Each provider runs in its own **isolated browser context** with its own saved session
- **Gemini** reuses the same chat thread — no new chat per request
- Requests per provider are **serialized** (queued) — concurrent requests wait their turn
- Prompt injection uses **clipboard paste** — instant, no character-by-character typing delay
- The browser stays open in the background while the server runs

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `No session for "X"` | Run `node scripts/login.js X` |
| Provider returns empty/wrong response | Site updated its UI — edit the selector in `src/providers/X.js` |
| Login session expired | Re-run `node scripts/login.js X` |
| Port already in use | `PORT=1338 npm start` |
| 2FA / CAPTCHA blocking login | The browser is visible during login — complete it manually |

---

# Security Notes

- `sessions/` contains your login cookies — **never commit or share this folder**
- The server is local only — not exposed to the internet
- These are your real accounts — avoid sending too many requests in a short time

---

## Project Structure

```
llm-bridge/
├── scripts/
│   └── login.js               # One-time login per provider
├── sessions/                  # Auto-created, gitignored — stores auth cookies
├── src/
│   ├── providers/
│   │   ├── base.js            # Shared base class
│   │   ├── chatgpt.js
│   │   ├── gemini.js
│   │   ├── deepseek.js
│   │   └── claude.js
│   └── server/
│       ├── index.js           # Express server + OpenAI-compatible API
│       └── browser-manager.js # Manages browser lifecycle + provider queue
├── .gitignore
├── package.json
└── README.md
```