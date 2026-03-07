import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import OpenAI from 'openai';
import { getUserAdmin } from '@/lib/firebase/admin-firestore';

const geminiKey = process.env.GEMINI_API_KEY;
const nvidiaKey = process.env.NVIDIA_API_KEY;

async function matchWithGemini(user: any, unvotedIdeas: any[]) {
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');
  
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          recommendations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                ideaId: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                matchScore: { type: SchemaType.NUMBER },
              },
              required: ['ideaId', 'reason', 'matchScore'],
            },
          },
        },
        required: ['recommendations'],
      },
    },
  });

  const prompt = `Match this user to relevant ideas.
USER: ${user.displayName} | Expertise: ${user.profile?.expertise?.join(', ')}
IDEAS:
${unvotedIdeas.map(i => `- ID: ${i.id} | Title: "${i.title}"`).join('\n')}`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function matchWithNvidia(user: any, unvotedIdeas: any[]) {
  if (!nvidiaKey) throw new Error('NVIDIA_API_KEY not configured');
  
  const openai = new OpenAI({
    apiKey: nvidiaKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  const completion = await openai.chat.completions.create({
    model: "microsoft/phi-4-mini-flash-reasoning",
    messages: [
      {
        role: "user",
        content: `You are an AI matchmaker. Match this user to ideas based on skills.
Respond ONLY with JSON: {"recommendations": [{"ideaId": "...", "reason": "...", "matchScore": 0.5}]}

USER: ${user.displayName} | Expertise: ${user.profile?.expertise?.join(', ')}
IDEAS:
${unvotedIdeas.map(i => `- ID: ${i.id} | Title: "${i.title}"`).join('\n')}`
      }
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const rawContent = completion.choices[0]?.message?.content || '';
  
  // Clean reasoning tags
  let processedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '');
  processedContent = processedContent.replace(/<think>[\s\S]*/g, '');
  processedContent = processedContent.replace(/<\/think>/g, '');
  processedContent = processedContent.trim();

  // STAGE 1: Look for JSON blocks in markdown code fences
  const codeBlockMatch = processedContent.match(/```json\s?([\s\S]*?)\s?```/) || processedContent.match(/```\s?([\s\S]*?)\s?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }

  // STAGE 2: Look for the first/last brace pair
  const firstBrace = processedContent.indexOf('{');
  const lastBrace = processedContent.lastIndexOf('}');
  if (firstBrace !== -1) {
    let candidate = lastBrace > firstBrace 
      ? processedContent.substring(firstBrace, lastBrace + 1)
      : processedContent.substring(firstBrace);
    
    // TRUNCATION RECOVERY
    if (!candidate.endsWith('}')) {
      candidate = candidate.trim();
      if (!candidate.endsWith(']')) candidate += '"]';
      if (!candidate.endsWith('}')) candidate += ']}';
    }

    try {
      return JSON.parse(candidate);
    } catch (e) {
      try {
        const recovered = candidate + '"]}'; 
        return JSON.parse(recovered);
      } catch (e2) {}
    }
  }

  const jsonMatch = processedContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Nvidia response');
  return JSON.parse(jsonMatch[0]);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const uid = searchParams.get('uid');
  const clubId = searchParams.get('clubId');

  if (!uid || !clubId) {
    return NextResponse.json({ success: false, error: 'uid and clubId are required' }, { status: 400 });
  }

  try {
    const user = await getUserAdmin(uid);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const { getFirestore } = require('firebase-admin/firestore');
    const { getAdminApp } = require('@/lib/firebase/admin');
    const adminDb = getFirestore(getAdminApp());

    const ideasSnap = await adminDb.collection('ideas')
      .where('clubId', '==', clubId)
      .where('status', 'in', ['open', 'under_review'])
      .limit(20).get();

    const ideas = ideasSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (ideas.length === 0) return NextResponse.json({ success: true, matches: [] });

    const votesSnap = await adminDb.collection('votes').where('uid', '==', uid).get();
    const votedIdeaIds = new Set(votesSnap.docs.map((d: any) => d.data().ideaId));
    const unvotedIdeas = ideas.filter((i: any) => !votedIdeaIds.has(i.id));

    if (unvotedIdeas.length === 0) return NextResponse.json({ success: true, matches: [] });

    let result = null;
    let errors = [];

    // 1. Try Gemini First
    try {
      result = await matchWithGemini(user, unvotedIdeas);
    } catch (e: any) {
      console.warn('Matchmaking: Gemini failed, trying Nvidia:', e.message);
      errors.push(`Gemini: ${e.message}`);
    }

    // 2. Fallback to Nvidia
    if (!result) {
      try {
        result = await matchWithNvidia(user, unvotedIdeas);
      } catch (e: any) {
        console.error('Matchmaking: Nvidia also failed:', e.message);
        errors.push(`Nvidia: ${e.message}`);
      }
    }

    if (!result) throw new Error(`Matchmaking failed. Errors: ${errors.join(' | ')}`);

    const matches = (result.recommendations || []).map((rec: any) => {
      const idea = ideas.find((i: any) => i.id === rec.ideaId);
      return idea ? { ...rec, idea } : null;
    }).filter(Boolean);

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('AI matchmaking failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Matchmaking failed', matches: [] }, { status: 500 });
  }
}
