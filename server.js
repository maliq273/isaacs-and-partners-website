import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleAnthonyChat, getAnthonySession, resetAnthonySession } from './server/anthonyGeminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Anthony Gemini Chatbot Runtime' });
});

// Anthony Gemini Chatbot API
app.post('/api/anthony/chat', async (req, res) => {
  try {
    const { sessionId, message, role, serviceCategory, serviceName, user } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'A message string is required.' });
    }

    const response = await handleAnthonyChat({
      sessionId,
      message,
      role: role || 'CLIENT',
      serviceCategory,
      serviceName,
      user
    });

    res.json(response);
  } catch (error) {
    console.error('[Anthony Chat API Error]:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

app.get('/api/anthony/session/:sessionId', (req, res) => {
  const session = getAnthonySession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }
  res.json({
    ok: true,
    sessionId: session.id,
    role: session.role,
    clientWants: session.clientWants,
    facts: session.facts,
    serviceCategory: session.serviceCategory,
    serviceName: session.serviceName,
    messageCount: session.history.length,
    updatedAt: session.updatedAt
  });
});

app.post('/api/anthony/session/:sessionId/reset', (req, res) => {
  const reset = resetAnthonySession(req.params.sessionId);
  res.json({ ok: true, reset });
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Fallback to 404.html for unmatched routes
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
