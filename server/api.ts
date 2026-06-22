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

app.post('/api/triage-chat', async (req, res) => {
  const { messages, incident } = req.body;

  if (!messages || !incident) {
    res.status(400).json({ error: 'Missing messages or incident body' });
    return;
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

    res.json({
      reply,
      extractedData: {
        severity,
        criticalInfo,
        tags
      }
    });
    return;
  }

  // ----- Real Gemini call -----
  try {
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
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating triage reply:', error);
    res.status(500).json({ error: 'Failed to generate triage reply' });
  }
});

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

app.post('/api/generate-playbook', async (req, res) => {
  const { title, type, description, severity } = req.body;

  if (!type) {
    res.status(400).json({ error: 'Missing incident type context' });
    return;
  }

  const defaultTasks = getFallbackPlaybook(type, title || 'unspecified');

  if (!process.env.GEMINI_API_KEY) {
    res.json({ playbook: defaultTasks });
    return;
  }

  try {
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
        res.json(parsed);
        return;
      }
    } catch (e) {
      console.error('Failed to parse playbook JSON from Gemini response:', responseText, e);
    }
    res.json({ playbook: defaultTasks });
  } catch (error) {
    console.error('Error in /api/generate-playbook:', error);
    res.json({ playbook: defaultTasks });
  }
});

app.post('/api/optimize-dispatch', async (req, res) => {
  const { incident, staff } = req.body;

  if (!incident || !staff || !Array.isArray(staff)) {
    res.status(400).json({ error: 'Missing incident or staff list context' });
    return;
  }

  const getFallbackRecommendations = () => {
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

    matches.sort((a: any, b: any) => b.score - a.score);

    const recommended = matches.slice(0, 3).filter((m: any) => m.score >= 45);
    
    if (recommended.length === 0 && matches.length > 0) {
      recommended.push(matches[0]);
    }

    return {
      recommendations: recommended,
      reasoning: `AI Dispatch recommendation generated based on role matching (${rolesForType.join(', ')}) and floor proximity (target floor: ${incident.location.floor}).`
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    res.json(getFallbackRecommendations());
    return;
  }

  try {
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
        res.json(parsed);
        return;
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini recommendations JSON. Response text was:', responseText, parseError);
    }
    
    res.json(getFallbackRecommendations());
  } catch (error: any) {
    console.error('Error generating AI dispatch recommendations:', error);
    res.json(getFallbackRecommendations());
  }
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the old process or use a different port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
