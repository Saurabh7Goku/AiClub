import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const nvidiaKey = process.env.NVIDIA_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

async function tagWithNvidia(title: string, problemStatement: string, proposedAiUsage: string, category: string) {
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
        content: `Analyze this idea submission and generate 3 tags, 1 category, and 2 similarity keywords. 
Respond ONLY with a JSON object: {"tags": ["tag1", "tag2", "tag3"], "suggestedCategory": "LLM/Vision/Infra/Agents/Research/Other", "similarityKeywords": ["keyword1", "keyword2"]}

Title: ${title}
Problem: ${problemStatement}
AI Usage: ${proposedAiUsage}`
      }
    ],
    temperature: 0.6,
    max_tokens: 2048,
  });

  const rawContent = completion.choices[0]?.message?.content || '';

  // LOG TO FILE FOR DEBUGGING
  try {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpPath = path.join(tmpDir, 'nvidia_raw.txt');
    fs.appendFileSync(tmpPath, `\n\n--- NEW REQUEST (${new Date().toISOString()}) ---\n${rawContent}`);
  } catch (e) {
    console.error('Failed to log to file:', e);
  }

  // Clean reasoning tags that Phi-4-mini might produce
  // Handle both completed and uncompleted tags
  let processedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '');
  processedContent = processedContent.replace(/<think>[\s\S]*/g, '');
  processedContent = processedContent.replace(/<\/think>/g, '');
  processedContent = processedContent.trim();

  // STAGE 1: Look for JSON blocks in markdown code fences
  const codeBlockMatch = processedContent.match(/```json\s?([\s\S]*?)\s?```/) || processedContent.match(/```\s?([\s\S]*?)\s?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) { }
  }

  // STAGE 2: Look for the first/last brace pair
  const firstBrace = processedContent.indexOf('{');
  const lastBrace = processedContent.lastIndexOf('}');
  if (firstBrace !== -1) {
    let candidate = lastBrace > firstBrace
      ? processedContent.substring(firstBrace, lastBrace + 1)
      : processedContent.substring(firstBrace);

    // TRUNCATION RECOVERY: If it looks like it ended prematurely, try to close it
    if (!candidate.endsWith('}')) {
      // Very basic attempt: just add the closing braces
      // More advanced: check if we are in an array or object
      candidate = candidate.trim();
      if (!candidate.endsWith(']')) candidate += '"]'; // Assume it was a list item
      if (!candidate.endsWith('}')) candidate += ']}'; // Assume it was an object property
    }

    try {
      return JSON.parse(candidate);
    } catch (e) {
      // If it still fails, try a very messy recovery
      try {
        // Just force close everything
        const recovered = candidate + '"]}}';
        return JSON.parse(recovered);
      } catch (e2) { }
    }
  }

  // STAGE 3: Final Regex Fallback
  const jsonMatch = processedContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) { }
  }

  throw new Error(`Failed to extract JSON from Nvidia response. Raw length: ${rawContent.length}`);
}

async function tagWithGemini(title: string, problemStatement: string, proposedAiUsage: string, category: string) {
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const prompt = `Analyze this idea and return JSON with tags, suggestedCategory, and similarityKeywords.
Title: ${title}
Problem: ${problemStatement}
AI Usage: ${proposedAiUsage}`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedCategory: { type: Type.STRING },
          similarityKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['tags', 'suggestedCategory', 'similarityKeywords'],
      },
    },
  });

  return JSON.parse(result.text ?? '');
}

export async function POST(req: NextRequest) {
  try {
    const { title, problemStatement, proposedAiUsage, category } = await req.json();

    if (!title || !problemStatement) {
      return NextResponse.json({ success: false, error: 'Title and problem statement are required' }, { status: 400 });
    }

    let result = null;
    let errors = [];

    // 1. Try Nvidia First
    try {
      result = await tagWithNvidia(title, problemStatement, proposedAiUsage, category);
    } catch (e: any) {
      console.warn('Tagging: Nvidia failed, trying Gemini:', e.message);
      errors.push(`Nvidia: ${e.message}`);
    }

    // 2. Fallback to Gemini 2.0
    if (!result) {
      try {
        result = await tagWithGemini(title, problemStatement, proposedAiUsage, category);
      } catch (e: any) {
        console.error('Tagging: Gemini also failed:', e.message);
        errors.push(`Gemini: ${e.message}`);
      }
    }

    if (!result) {
      throw new Error(`Tagging failed. Errors: ${errors.join(' | ')}`);
    }

    return NextResponse.json({
      success: true,
      tags: result.tags || [],
      suggestedCategory: result.suggestedCategory || category || 'Other',
      similarityKeywords: result.similarityKeywords || [],
    });
  } catch (error: any) {
    console.error('AI tagging failed:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to generate tags',
      tags: [],
    }, { status: 500 });
  }
}
