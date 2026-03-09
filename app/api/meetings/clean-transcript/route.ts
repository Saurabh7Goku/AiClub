import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { callNvidia } from '@/lib/ai/nvidia';

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
};

export async function POST(request: NextRequest) {
  try {
    const { rawTranscript, meetingId } = await request.json();

    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return NextResponse.json(
        { success: false, error: 'rawTranscript is required' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert meeting transcript editor. Your job is to clean up a raw, noisy meeting transcript.

RAW TRANSCRIPT:
"""
${rawTranscript}
"""

Instructions:
1. Remove all filler words (um, uh, like, you know, hmm, etc.)
2. Remove noise artifacts, repeated words, and false starts
3. Fix incomplete or broken sentences — reconstruct them naturally
4. Fix obvious grammar and spelling errors
5. Maintain speaker turns if they are present (e.g., "Speaker 1:", "Speaker 2:")
6. Preserve all technical terms, names, and acronyms accurately
7. Keep the original meaning and intent intact — do NOT add information
8. Format the output as clean, readable paragraphs with speaker labels

Return ONLY the cleaned transcript text. No explanations, no preamble.`;

    // 1. Try Gemini first
    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const cleanedTranscript = result.text ?? '';

      return NextResponse.json({
        success: true,
        cleanedTranscript,
        meetingId,
      });
    } catch (geminiError) {
      console.warn('Gemini clean-transcript failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);
    }

    // 2. Fallback to NVIDIA (Kimi-K2 for high quality transcript editing)
    const cleanedTranscript = await callNvidia(prompt, { model: 'kimi', temperature: 0.15 });

    return NextResponse.json({
      success: true,
      cleanedTranscript,
      meetingId,
    });
  } catch (error) {
    console.error('Error cleaning transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
