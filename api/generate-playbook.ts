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

// Rate limiter for Edge Runtime
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

function getFallbackPlaybook(type: string, title: string): string[] {
  const t = (type || '').toLowerCase();
  if (t === 'fire') {
    return [
      'Confirm fire alarm location and activate primary evacuation sirens.',
      'Recall all on-duty elevators to the lobby level and lock them out.',
      'Broadcast emergency evacuation announcement to all building levels.',
      'Dispatch Fire Response units to assist mobility-impaired guests.',
      'Establish a safe assembly point and initiate emergency safety check roll calls.'
    ];
  } else if (t === 'medical') {
    return [
      'Locate emergency scene and deploy first responder team with AED / trauma kit.',
      'Clear elevator pathways and secure building entrance for ambulance arrival.',
      'Identify critical patient information (age, symptoms, medical history) via guest channel.',
      'Perform continuous CPR / basic life support until EMT rescue units arrive.',
      'Log details of patient handoff and record incident resolution.'
    ];
  } else if (t === 'security') {
    return [
      'Verify threat level via security cameras or on-scene reports.',
      'Initiate lockdown protocols for the affected zones and secure main doors.',
      'Notify local police department and share live building CCTV access.',
      'Dispatch security units to establish a containment perimeter around the zone.',
      'Provide calm, direct shelter-in-place instructions to guests via emergency chat.'
    ];
  } else if (t === 'hazmat') {
    return [
      'Identify the hazardous material, spill size, and exposure risks.',
      'Isolate the HVAC/ventilation systems to contain airborne contaminants.',
      'Evacuate the immediate area and restrict access to unauthorized personnel.',
      'Contact municipal Hazmat responders and prepare containment records.',
      'Deploy medical standby team to triage guests exhibiting exposure symptoms.'
    ];
  } else if (t === 'weather') {
    return [
      'Monitor weather advisories and identify severe threat arrival timeline.',
      'Instruct all guests and staff to move away from windows and relocate to low levels.',
      'Verify auxiliary backup generator status and activate emergency lighting.',
      'Distribute emergency food, water, and first-aid supplies to shelter points.',
      'Maintain communication with local authorities and wait for all-clear advisory.'
    ];
  } else {
    return [
      `Initiate inspection protocols for the reported incident: ${title}.`,
      'Deploy nearest responder unit to assess the situation and report back.',
      'Notify management team and review immediate safety hazards.',
      'Formulate tailored resolution roadmap based on responder assessments.',
      'Document findings, record resolution actions, and close incident ticket.'
    ];
  }
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

  const { title, type, description, severity } = body;

  if (!type) {
    return jsonResponse(400, { error: 'Missing incident type context' });
  }

  const defaultTasks = getFallbackPlaybook(type, title || 'unspecified');

  // ----- Fallback if no API key -----
  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(200, { playbook: defaultTasks });
  }

  // ----- Real Gemini call -----
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are SentinelStay's emergency response coordinator.
Your task is to generate a Standard Operating Procedure (SOP) checklist containing exactly 5 critical action items tailored to the active emergency incident described below.

Incident Details:
- Title: ${title || 'Unspecified'}
- Type: ${type}
- Severity: Level ${severity || '3'} (scale 1-4)
- Description: ${description || 'No description provided'}

Instructions:
1. Generate exactly 5 critical, clear, actionable SOP checklist items.
2. Tailor them specifically to the incident details (e.g. for fires, include evacuation and elevator lockout; for medical, triage and EMT routing; for security, perimeter control).
3. Do not include checkboxes, numbers, or bullet points in the strings. Keep each task to 1 sentence (under 15 words).
4. You MUST output ONLY a valid JSON object matching the following schema. Do NOT wrap it in markdown code blocks like \`\`\`json. Output must be raw JSON only.

Schema:
{
  "playbook": [
    "Checklist task 1 text",
    "Checklist task 2 text",
    "Checklist task 3 text",
    "Checklist task 4 text",
    "Checklist task 5 text"
  ]
}

Double check that the array has exactly 5 items and is clean valid JSON.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.playbook && Array.isArray(parsed.playbook) && parsed.playbook.length === 5) {
        return jsonResponse(200, parsed);
      }
      console.warn('Invalid checklist array returned from Gemini, falling back...');
    } catch (parseError) {
      console.error('Failed to parse Gemini playbook JSON. Response text was:', responseText, parseError);
    }
    
    // Default safe fallback if JSON validation/parsing fails
    return jsonResponse(200, { playbook: defaultTasks });
  } catch (error: any) {
    console.error('Error generating AI playbook:', error);
    return jsonResponse(200, { playbook: defaultTasks });
  }
}
