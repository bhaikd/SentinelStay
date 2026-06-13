import { GoogleGenerativeAI } from '@google/generative-ai';

// Run on Vercel's Edge runtime so SSE streams are forwarded byte-for-byte
// (the default Node serverless runtime buffers responses, which breaks SSE
// in production and is the root cause of the "AI summarize not working in
// the staff/command center" issue).
export const config = {
  runtime: 'edge',
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const sseHeaders: Record<string, string> = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Disables proxy buffering on most CDNs (incl. Vercel/Nginx).
  'X-Accel-Buffering': 'no',
};

interface IncidentBody {
  title?: string;
  description?: string;
  affectedSystems?: string;
  timestamps?: string;
}

// Very small token-bucket-ish rate limiter, per IP, in-memory per Edge instance.
// Good enough as a first line of defense; for hard limits use Upstash/Redis.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const ipHits = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);    //Make sure no data gets leaked
  if (!entry || entry.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}
//Make the server 
function jsonResponse(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

function streamFromIterable(
  iter: AsyncIterable<string> | Iterable<string>,
  delayMs = 0
): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of iter as AsyncIterable<string>) {
          if (!text) continue;
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
          if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        }
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: sseHeaders });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'anonymous';
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return jsonResponse(
      429,
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { 'Retry-After': String(rl.retryAfter) }
    );
  }
//Look make this project deployment ready making it recruiter ready and production ready.
  let body: IncidentBody;
  try {
    body = (await req.json()) as IncidentBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const title = (body.title || 'Unknown Incident').slice(0, 200);
  const description = (body.description || '').slice(0, 4000);
  const affectedSystems = (body.affectedSystems || '').slice(0, 1000);
  const timestamps = (body.timestamps || '').slice(0, 4000);

  // ----- Mock fallback if no API key (dev/demo) ---------------------------
  if (!process.env.GEMINI_API_KEY) {
    const mock =
      `**Summary**\n` +
      `This is a simulated ${title} incident. The automated systems have detected anomalies and ` +
      `initiated initial response protocols. Staff are actively investigating the affected areas ` +
      `to determine the root cause and ensure guest safety.\n\n` +
      `**Suggested Next Actions**\n` +
      `1. Dispatch nearest available security personnel to investigate the primary trigger location.\n` +
      `2. Prepare a standby medical unit in the lobby as a precautionary measure.\n` +
      `3. Initiate a PA system announcement to guests in adjacent zones to remain calm and await instructions.\n\n` +
      `**Priority Score**\n` +
      `8\n*(High priority due to potential life-safety implications of unverified alarms.)*`;
    const chunks = mock.match(/.{1,15}/g) || [mock];
    return streamFromIterable(chunks, 30);
  }

  // ----- Real Gemini call -------------------------------------------------
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

    async function* texts(): AsyncGenerator<string> {
      for await (const chunk of result.stream) {
        const t = chunk.text();
        if (t) yield t;
      }
    }
    return streamFromIterable(texts());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate summary';
    // eslint-disable-next-line no-console
    console.error('[summarize-incident] error:', message);
    return jsonResponse(500, { error: message });
  }
}
