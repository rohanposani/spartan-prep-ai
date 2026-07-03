const express = require('express');
const path = require('path');
const app = express();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.warn('\n  ⚠️  OPENAI_API_KEY is not set!');
  console.warn('  AI features will not work until the key is provided.\n');
}

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.status(200).send('ok'));

// Serve spartanstudy.html at root (local dev only — Vercel uses rewrites)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'spartanstudy.html'));
});

// ── /api/chat endpoint ───────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, json_mode, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const body = {
      model: 'gpt-4.1-mini',
      messages,
      temperature: 0.7,
      max_tokens: Math.min(max_tokens || 4096, 16000),
    };
    if (json_mode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI API error',
      });
    }

    res.json({ content: data.choices[0].message.content });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

module.exports = app;
