import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { db } from '@/lib/firebase/admin';

// Helper to create a unique ID for a URL/Title
function getCacheId(url: string, title: string) {
  const str = url || title;
  // Simple "hash" for the ID
  return Buffer.from(str).toString('base64').substring(0, 50).replace(/\//g, '_');
}

// In-memory lock to prevent concurrent requests for the SAME content
const activeRequests = new Set<string>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, url } = body;

  try {
    if (!title && !content) {
      return NextResponse.json({ success: false, error: 'Title or content is required' }, { status: 400 });
    }

    // 1. Check Cache first
    const cacheId = getCacheId(url, title);
    
    // Concurrent request lock
    if (activeRequests.has(cacheId)) {
      return NextResponse.json({ success: false, error: 'Request already in progress' }, { status: 429 });
    }
    activeRequests.add(cacheId);

    try {
      const cacheRef = db.collection('ai_summaries').doc(cacheId);
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        activeRequests.delete(cacheId);
        console.log('Serving summary from cache');
        return NextResponse.json({
          success: true,
          bullets: cacheDoc.data()?.bullets,
          model: cacheDoc.data()?.model + ' (cached)',
        });
      }
    } catch (e) {
      console.warn('Cache lookup failed, proceeding to AI:', e);
    }

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let result = null;
    let errors = [];

    // Attempting a bidirectional fallback strategy
    // 1. Try Nvidia first (Phi-4 mini reasoning)
    if (nvidiaKey) {
      try {
        result = await summarizeWithNvidia(nvidiaKey, title, content);
      } catch (e: any) {
        console.warn('Nvidia attempt failed, logging error and trying fallback:', e.message);
        errors.push(`Nvidia: ${e.message}`);
      }
    }

    // 2. Try Gemini if Nvidia failed or was skipped
    if (!result && geminiKey) {
      try {
        // Try the best Gemini model first
        result = await summarizeWithGemini(geminiKey, title, 'gemini-2.0-flash-lite', content);
      } catch (e: any) {
        console.warn('Gemini 2.0 failed, trying 2.5 fallback:', e.message);
        errors.push(`Gemini 2.0: ${e.message}`);
        
        try {
          result = await summarizeWithGemini(geminiKey, title, 'gemini-2.5-flash-lite', content);
        } catch (e2: any) {
          console.error('Gemini 2.5 also failed');
          errors.push(`Gemini 2.5: ${e2.message}`);
        }
      }
    }

    // 3. Final Fallback: If EVERYTHING else failed but Nvidia hasn't been re-tried (unlikely in this flow)
    // or if we want to ensure we tried every possible route.
    
    activeRequests.delete(cacheId);

    if (!result) {
      throw new Error(`All AI providers failed. Errors: ${errors.join(' | ')}`);
    }

    // 4. Save to Cache for future requests
    try {
      await db.collection('ai_summaries').doc(cacheId).set({
        title,
        url: url || '',
        bullets: result.bullets,
        model: result.model,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to save to cache:', e);
    }

    return NextResponse.json({
      success: true,
      bullets: result.bullets,
      model: result.model,
    });

  } catch (error: any) {
    activeRequests.delete(getCacheId(url, title));
    console.error('AI summarization failed:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to summarize',
      bullets: [],
    }, { status: 500 });
  }
}

async function summarizeWithNvidia(apiKey: string, title: string, content?: string) {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "microsoft/phi-4-mini-flash-reasoning",
      messages: [
        {
          role: "user",
          content: `Summarize this AI/ML technology article into exactly 3 concise bullet points. Each bullet should be one sentence.
Title: ${title}
${content ? `Content: ${content}` : ''}
Respond ONLY with a JSON object: {"bullets": ["bullet 1", "bullet 2", "bullet 3"]}`
        }
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    let rawContent = completion.choices[0]?.message?.content || '';
    
    // Robustly strip <think> blocks and dangling tags
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    rawContent = rawContent.replace(/<\/?think>/g, '');
    
    let bullets: string[] = [];
    
    // Attempt to extract JSON array from content
    // Models sometimes wrap JSON in a string like: {"bullets": ["..."]}
    const jsonMatch = rawContent.match(/\{[\s\S]*"bullets"[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
      } catch (e) {
        console.warn('Failed to parse primary JSON match, trying fuzzy extraction');
      }
    }

    // Fallback: If bullets still empty, try to find any array-like structure or split by lines
    if (bullets.length === 0) {
      const arrayMatch = rawContent.match(/\[\s*"[\s\S]*"\s*\]/);
      if (arrayMatch) {
        try {
          bullets = JSON.parse(arrayMatch[0]);
        } catch (e) { /* ignore */ }
      }
    }

    // Final Fallback: Split by lines and clean up markdown/symbols
    if (bullets.length === 0) {
      bullets = rawContent
        .split('\n')
        .map(l => l.trim().replace(/^[-•*]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 5)
        .slice(0, 3);
    }

    // Final cleanup of bullets (strip JSON escapes if any)
    bullets = bullets.map(b => {
      try {
        // If it looks like a JSON string, try to parse it
        if (b.startsWith('"') && b.endsWith('"')) return JSON.parse(b);
        return b;
      } catch {
        return b;
      }
    }).filter(b => b && b.length > 0);

    if (!bullets || bullets.length === 0) throw new Error('Nvidia returned no bullets');

    return { bullets: bullets.slice(0, 3), model: 'microsoft/phi-4-mini-flash-reasoning' };
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Nvidia request timed out (queue too long)');
    throw e;
  }
}

async function summarizeWithGemini(apiKey: string, title: string, modelName: string, content?: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Summarize this AI/ML article in exactly 3 bullet points. 
Title: ${title}
${content ? `Content: ${content}` : ''}
Return ONLY a JSON object: {"bullets": ["bullet 1", "bullet 2", "bullet 3"]}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let bullets: string[] = [];
    const jsonMatch = text.match(/\{[\s\S]*"bullets"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        bullets = JSON.parse(jsonMatch[0]).bullets;
      } catch (e) {
        throw new Error('Failed to parse Gemini JSON response');
      }
    } else {
      bullets = text.split('\n').filter((l: string) => l.trim()).slice(0, 3);
    }

    if (!bullets || bullets.length === 0) throw new Error('Gemini returned no bullets');

    return { bullets: bullets.slice(0, 3), model: modelName };
  } catch (e: any) {
    console.error(`Gemini (${modelName}) failed:`, e);
    throw e;
  }
}





