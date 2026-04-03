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
  const { messages, json_mode } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const body = {
      model: 'gpt-4.1-mini',
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

// ── /api/generate-notes endpoint ─────────────────────────────
app.post('/api/generate-notes', async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content string is required' });
  }

  if (content.replace(/═══.*═══/g, '').trim().length < 100) {
    return res.status(400).json({
      error: 'Not enough text was extracted from your materials. Try converting PPT files to PPTX or PDF format and re-uploading.',
    });
  }

  try {
    const body = {
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert SJSU professor creating comprehensive study notes. Analyze the provided course material and generate well-structured notes. Return ONLY valid JSON:
{
  "title": "A descriptive title for these notes",
  "topic": "The main subject/course topic",
  "content": "Formatted notes as a single string using the following structure:\\n\\n## Key Topics\\n- topic 1\\n- topic 2\\n\\n## Important Keywords & Definitions\\n- **keyword**: definition\\n\\n## Core Concepts\\n- concept explanation\\n\\n## Notable Examples\\n- example from the material\\n\\n## Summary\\n- brief overall summary"
}
Generate thorough, exam-focused notes that highlight the most important information a student needs to know.`,
        },
        {
          role: 'user',
          content: 'Generate comprehensive study notes from this material:\n\n' + content.slice(0, 20000),
        },
      ],
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    };

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

    const parsed = JSON.parse(data.choices[0].message.content);
    res.json({ notes: parsed });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

module.exports = app;
