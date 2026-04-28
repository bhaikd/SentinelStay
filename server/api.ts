import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.post('/api/summarize-incident', async (req, res) => {
  const { title, description, affectedSystems, timestamps } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    // FALLBACK: If no API key is provided, stream a realistic mock response for presentations
    console.log("No GEMINI_API_KEY found. Streaming mock response...");
    
    const mockResponse = `**Summary**
This is a simulated ${title} incident. The automated systems have detected anomalies and initiated initial response protocols. Staff are actively investigating the affected areas to determine the root cause and ensure guest safety.

**Suggested Next Actions**
1. Dispatch nearest available security personnel to investigate the primary trigger location.
2. Prepare a standby medical unit in the lobby as a precautionary measure.
3. Initiate a PA system announcement to guests in adjacent zones to remain calm and await instructions.

**Priority Score**
8
*(High priority due to potential life-safety implications of unverified alarms.)*`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chunks = mockResponse.match(/.{1,15}/g) || [mockResponse];
    let i = 0;
    const interval = setInterval(() => {
      if (i < chunks.length) {
        res.write(`data: ${JSON.stringify({ text: chunks[i] })}\n\n`);
        i++;
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
        clearInterval(interval);
      }
    }, 50); // Fast realistic streaming
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an AI assistant for an emergency response command center.
Please summarize the following incident context.
Your response MUST contain exactly three sections:
1. Summary — a 2–3 sentence plain-English summary of the incident
2. Suggested Next Actions — a numbered list of exactly 3 recommended steps the on-call team should take
3. Priority Score — a single integer from 1–10 with a one-line justification

Incident Context:
Title: ${title}
Description: ${description}
Affected Systems/Guests: ${affectedSystems}
Timeline: ${timestamps}`;

    const result = await model.generateContentStream(prompt);
    
    // Use SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error generating summary:', error);
    // If headers are already sent, we can't send a 500 status code
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate summary' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate summary' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
