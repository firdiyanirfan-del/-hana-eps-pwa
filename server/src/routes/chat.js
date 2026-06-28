import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { messages, model = 'llama-3.1-8b-instant', temperature = 0.7, max_tokens = 2048 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const groqKey = process.env.GROQ_KEY;
    if (!groqKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', response.status, err);
      return res.status(response.status).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;