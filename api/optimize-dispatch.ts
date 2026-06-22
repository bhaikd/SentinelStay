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

function getFallbackRecommendations(incident: any, staff: any[]) {
  const relevantRoles: Record<string, string[]> = {
    fire: ['security', 'maintenance', 'engineering', 'management'],
    medical: ['medical', 'management', 'security'],
    security: ['security', 'management'],
    hazmat: ['maintenance', 'engineering', 'security'],
    weather: ['maintenance', 'housekeeping', 'security', 'management'],
    other: ['security', 'maintenance', 'housekeeping', 'medical', 'management', 'engineering']
  };

  const type = (incident.type || 'other').toLowerCase();
  const rolesForType = relevantRoles[type] || relevantRoles.other;
  
  const matches = staff.map((s: any) => {
    const isRoleMatch = rolesForType.includes(s.role.toLowerCase());
    const floorDiff = Math.abs(s.location.floor - incident.location.floor);
    const isFloorMatch = s.location.building === incident.location.building;
    
    let suitability = 50; // Base score
    if (isRoleMatch) suitability += 30;
    if (isFloorMatch) suitability += 15;
    suitability -= floorDiff * 3; // Subtract score based on distance
    suitability = Math.max(10, Math.min(99, suitability));

    let explanation = `${s.unit} (${s.name}) is recommended. `;
    if (isRoleMatch) {
      explanation += `Their role as ${s.role} is highly relevant for the ${incident.type} emergency. `;
    } else {
      explanation += `Their role is ${s.role}. `;
    }
    if (isFloorMatch) {
      if (floorDiff === 0) {
        explanation += `Located on the same floor as the incident, allowing immediate response.`;
      } else {
        explanation += `Located in the same building, only ${floorDiff} floors away.`;
      }
    } else {
      explanation += `Located in ${s.location.building}, Floor ${s.location.floor}.`;
    }

    return {
      staffId: s.id,
      score: suitability,
      explanation
    };
  });

  // Sort by suitability score descending
  matches.sort((a: any, b: any) => b.score - a.score);

  // Recommend top 2-3 units if they have a score above 45
  const recommended = matches.slice(0, 3).filter((m: any) => m.score >= 45);
  
  // If no one matches criteria, recommend the top one anyway
  if (recommended.length === 0 && matches.length > 0) {
    recommended.push(matches[0]);
  }

  return {
    recommendations: recommended,
    reasoning: `AI Dispatch recommendation generated based on role matching (${rolesForType.join(', ')}) and floor proximity (target floor: ${incident.location.floor}).`
  };
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

  const { incident, staff } = body;

  if (!incident || !staff || !Array.isArray(staff)) {
    return jsonResponse(400, { error: 'Missing incident or staff list context' });
  }

  const fallback = getFallbackRecommendations(incident, staff);

  // ----- Fallback if no API key -----
  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(200, fallback);
  }

  // ----- Real Gemini call -----
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are SentinelStay's AI resource dispatcher.
Your goal is to optimize emergency responses by recommending the most suitable staff members (up to 3) to deploy to an active incident.

Active Incident Context:
- ID: ${incident.id}
- Title: ${incident.title}
- Type: ${incident.type}
- Severity: Level ${incident.severity} (scale 1-4)
- Location: ${incident.location.building}, Floor ${incident.location.floor}, Room ${incident.location.room}
- Description: ${incident.description}

Available Staff Units:
${JSON.stringify(staff.map((s: any) => ({
  id: s.id,
  name: s.name,
  role: s.role,
  unit: s.unit,
  building: s.location.building,
  floor: s.location.floor
})))}

Instructions:
1. Analyze the active incident type, location, and description.
2. Select the top 1 to 3 staff units who are best suited to handle this. Prioritize:
   - Match between staff role (e.g., medical for medical incident, security for threat, maintenance/engineering for fire/hazmat) and incident type.
   - Proximity: staff units in the same building and on the same or nearby floors.
3. For each recommended unit, provide a suitability score (10 to 99) and a concise, specific explanation (1 sentence).
4. Provide a high-level reasoning summary (1-2 sentences) explaining the resource allocation strategy.
5. You MUST output ONLY a valid JSON object matching the following schema. Do NOT include markdown code blocks like \`\`\`json. Output must be raw JSON only.

Schema:
{
  "recommendations": [
    {
      "staffId": "id of the staff member",
      "score": 85,
      "explanation": "Brief explanation of why they are recommended."
    }
  ],
  "reasoning": "High-level summary explanation of this resource selection strategy."
}

Double check that all recommended staffId values match the available staff IDs. Output must be raw valid JSON only.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        return jsonResponse(200, parsed);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini recommendations JSON. Response text was:', responseText, parseError);
    }
    
    return jsonResponse(200, fallback);
  } catch (error: any) {
    console.error('Error generating AI dispatch recommendations:', error);
    return jsonResponse(200, fallback);
  }
}
