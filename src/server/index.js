// src/server/index.js
import express from 'express';
import { BrowserManager } from './browser-manager.js';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 1337;
const app = express();
app.use(express.json());

const manager = new BrowserManager();

// ──────────────────────────────────────────────
// OpenAI-compatible endpoints
// ──────────────────────────────────────────────

// GET /v1/models  — lists available "models" (our providers)
app.get('/v1/models', (_req, res) => {
  res.json({ object: 'list', data: manager.availableModels() });
});

// POST /v1/chat/completions  — main inference endpoint
app.post('/v1/chat/completions', async (req, res) => {
  const { model, messages, stream } = req.body;

  if (!model || !messages?.length) {
    return res.status(400).json({ error: 'model and messages are required' });
  }

  // Convert messages array to a single prompt string
  // (browser UIs are single-turn; we send the full conversation as context)
  const prompt = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n') + '\nAssistant:';

  console.log(`\n📨 [${model}] Prompt: ${prompt.slice(0, 80)}...`);

  try {
    const t0 = Date.now();
    console.log(`\n📨 [${model}] Sending prompt (${prompt.length} chars)`);

    const text = await manager.sendPrompt(model, prompt);

    const t1 = Date.now();
    console.log(`✅ [${model}] Response received in ${((t1 - t0) / 1000).toFixed(2)}s (${text.length} chars)`);

    if (stream) {
      const t2 = Date.now();
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');

      const chunk = {
        id: `chatcmpl-${uuidv4()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ delta: { content: text }, index: 0, finish_reason: null }],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      const done = {
        ...chunk,
        choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
      };
      res.write(`data: ${JSON.stringify(done)}\n\n`);
      res.write('data: [DONE]\n\n');
      console.log(`📤 [${model}] Stream sent in ${((Date.now() - t2) / 1000).toFixed(2)}s`);
      return res.end();
    }

    const t2 = Date.now();
    const result = res.json({
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: text },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: -1,
        completion_tokens: -1,
        total_tokens: -1,
      },
    });
    console.log(`📤 [${model}] Response sent in ${((Date.now() - t2) / 1000).toFixed(2)}s`);
    console.log(`⏱️  [${model}] Total request time: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    return result;
  } catch (err) {
    console.error(`❌ [${model}] Error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'llm-bridge' }));

// ──────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────
(async () => {
  await manager.launch();
  app.listen(PORT, () => {
    console.log(`\n🚀 LLM Bridge running at http://localhost:${PORT}`);
    console.log(`   Models endpoint : http://localhost:${PORT}/v1/models`);
    console.log(`   Chat endpoint   : http://localhost:${PORT}/v1/chat/completions`);
    console.log(`\n   Point GitHub Copilot to: http://localhost:${PORT}`);
    console.log(`   No API key needed (use any string)\n`);
  });
})();

