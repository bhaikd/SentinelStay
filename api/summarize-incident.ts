import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    for (let i = 0; i < chunks.length; i++) {
      res.write(`data: ${JSON.stringify({ text: chunks[i] })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate summary' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate summary' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
