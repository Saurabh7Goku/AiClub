import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    const { question, boardContext, meetingId } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'question is required' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Step 1: Generate a text answer using the regular model
    const textPrompt = `You are an expert AI meeting assistant for an AI/ML Intelligence Club.
You speak in a professional yet friendly tone. Keep responses concise (2-4 sentences max).

Current board context:
"""
${boardContext || 'The board is currently empty.'}
"""

The user asks: ${question}

Provide a clear, helpful, and actionable answer. If discussing technical AI/ML topics, be accurate but accessible.`;

    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ parts: [{ text: textPrompt }] }],
    });

    const textReply =
      textResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textReply) {
      return NextResponse.json({
        success: true,
        audioBase64: null,
        textReply: 'I could not generate a response. Please try again.',
        fallback: true,
      });
    }

    // Step 2: Convert the text answer to speech using TTS model
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: textReply }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0];

      if (audioPart?.inlineData?.data) {
        return NextResponse.json({
          success: true,
          audioBase64: audioPart.inlineData.data,
          mimeType: audioPart.inlineData.mimeType || 'audio/L16;rate=24000',
          textReply,
        });
      }
    } catch (ttsError) {
      console.warn('TTS generation failed, returning text-only:', ttsError);
    }

    // Fallback: return text-only if TTS fails
    return NextResponse.json({
      success: true,
      audioBase64: null,
      textReply,
      fallback: true,
    });
  } catch (error) {
    console.error('Error in voice chat:', error);
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
