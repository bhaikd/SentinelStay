import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Simple rate limiter for Edge Runtime
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const ipHits = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);
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

function jsonResponse(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { messages, incident } = body;

  if (!messages || !incident) {
    return jsonResponse(400, { error: 'Missing messages or incident context' });
  }

  // ----- Fallback if no API key -----
  if (!process.env.GEMINI_API_KEY) {
    const lastMsg = messages[messages.length - 1]?.body || '';
    let reply = "We have received your message. Our emergency team is en-route. Please stay calm and await instructions.";
    let severity = incident.severity;
    let criticalInfo = "";
    let tags: string[] = [];

    const lower = lastMsg.toLowerCase();
    if (lower.includes('smoke') || lower.includes('fire') || lower.includes('burn')) {
      reply = "A fire response team has been dispatched. If there is smoke, cover your mouth with a damp cloth, stay low to the floor, and evacuate if possible.";
      severity = 4;
      criticalInfo = "Guest reports visible smoke or fire in vicinity.";
      tags = ["fire", "smoke"];
    } else if (lower.includes('hurt') || lower.includes('bleed') || lower.includes('injur') || lower.includes('broken')) {
      reply = "Medical responders have been alerted. Keep the injured area elevated and apply pressure to any active bleeding.";
      severity = 3;
      criticalInfo = "Guest reports physical injuries.";
      tags = ["injury", "medical"];
    } else if (lower.includes('trapped') || lower.includes('jam') || lower.includes('locked')) {
      reply = "Responders are aware of your location and are bringing breaching tools. Please remain close to the floor and stay inside.";
      severity = 4;
      criticalInfo = "Guest reports being trapped in room.";
      tags = ["trapped", "egress_blocked"];
    }

    return jsonResponse(200, {
      reply,
      extractedData: {
        severity,
        criticalInfo,
        tags
      }
    });
  }

  // ----- Real Gemini call -----
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are SentinelStay's automated AI emergency response assistant.
Your goal is to reassure the guest in a hospitality or corporate environment during an emergency, collect vital triage information, and provide immediate safety instructions.

Conversation history:
${JSON.stringify(messages)}

Active Incident context:
Title: ${incident.title}
Initial Description: ${incident.description}
Current Severity: ${incident.severity} (scale 1-4)

Please analyze the latest messages from the guest and the conversation context.
You MUST output a valid JSON object matching this schema (do not include any markdown formatting like \`\`\`json or extra text outside the JSON):
{
  "reply": "A brief (1-3 sentences), calm, reassuring response to the guest. Acknowledge what they said and provide a clear immediate next step. Speak directly to them.",
  "extractedData": {
    "severity": 1-4,
    "criticalInfo": "A brief summary of any new critical info reported (e.g., 'Guest reports leg fracture', 'Smoke visible in corridor'), or empty string if no new critical info.",
    "tags": ["array", "of", "relevant", "tags", "like", "fire", "injury", "trapped", "security"]
  }
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return jsonResponse(200, parsed);
  } catch (error: any) {
    console.error('Error generating triage reply:', error);
    return jsonResponse(500, { error: 'Failed to generate triage reply' });
  }
}
