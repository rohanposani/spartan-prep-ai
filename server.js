const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ── Your OpenAI API key ──────────────────────────────────────
// Set via environment variable (recommended):
//   OPENAI_API_KEY=sk-... node server.js
//
// Or paste it here (NOT recommended for production):
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.error('\n  ⚠️  OPENAI_API_KEY is not set!');
  console.error('  Run with: OPENAI_API_KEY=sk-... node server.js\n');
  process.exit(1);
}

app.use(express.json({ limit: '10mb' }));

// Serve spartanstudy.html at root (before static middleware)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'spartanstudy.html'));
});

app.use(express.static(path.join(__dirname)));

// ── /api/chat endpoint ───────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, json_mode } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const body = {
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
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

app.listen(PORT, () => {
  console.log(`\n  ✦ Spartan Prep AI server running at http://localhost:${PORT}`);
  console.log('  ✦ OpenAI API key loaded');
  console.log('  ✦ Open http://localhost:' + PORT + ' in your browser\n');
});
