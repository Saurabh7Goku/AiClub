import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { callNvidiaJSON } from '@/lib/ai/nvidia';

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
};

const meetingOutputSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "A transcript of the audio, if any" },
    summaryNotes: { type: Type.STRING, description: "Detailed summary of the meeting, encompassing audio, whiteboard notes and drawings" },
    implementationPlan: { type: Type.STRING, description: "A short implementation plan based on the discussion" },
    futureAgenda: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Suggested agenda items for the next meeting" },
    futureScopes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Future scopes or big picture goals identified" },
    promises: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Action items or promises made by participants" },
  },
  required: ['transcript', 'summaryNotes', 'implementationPlan', 'futureAgenda', 'futureScopes', 'promises'],
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const meetingId = form.get('meetingId');
    const audio = form.get('audio');
    const boardText = form.get('boardText');
    const canvasData = form.get('canvasData');

    if (!meetingId || typeof meetingId !== 'string') {
      return NextResponse.json({ success: false, error: 'meetingId is required' }, { status: 400 });
    }

    if (!audio && !boardText && !canvasData) {
      return NextResponse.json({ success: false, error: 'audio, board text or canvas data is required' }, { status: 400 });
    }

    const prompt = `You are an AI meeting assistant. You are given a meeting context containing either an audio recording, written notes from a shared whiteboard, or both.

Shared Whiteboard Notes:
${boardText || 'No whiteboard notes provided.'}

Canvas drawing data (serialized JSON):
${canvasData || 'No canvas data provided.'}

Tasks:
1) If audio is provided, it will be attached to this request. Transcribe it. Otherwise return 'No audio provided.'
2) Produce a comprehensive summary of the meeting, merging insights from the audio (if any) and the whiteboard notes.
3) Provide a short implementation plan based on the discussion.
4) Extract any items that should be added to a future agenda.
5) Extract broad future scopes or long-term goals discussed.
6) Extract final promises, commitments, and action items made by participants.

Return ONLY valid JSON matching this schema: {"transcript": "...", "summaryNotes": "...", "implementationPlan": "...", "futureAgenda": ["..."], "futureScopes": ["..."], "promises": ["..."]}`;

    // 1. Try Gemini first
    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      let uploadUri: string | null = null;
      let audioMimeType = 'audio/webm';

      if (audio && audio instanceof File) {
        audioMimeType = audio.type || 'audio/webm';
        const upload = await ai.files.upload({
          file: audio,
          config: {
            mimeType: audioMimeType,
            displayName: `meeting_${meetingId}.webm`,
          },
        });
        uploadUri = upload.uri!;
      }

      const parts: any[] = [{ text: prompt }];
      if (uploadUri) {
        parts.push({
          fileData: {
            mimeType: audioMimeType,
            fileUri: uploadUri,
          },
        });
      }

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: meetingOutputSchema,
        },
      });

      const text = result.text ?? '';
      const parsed = JSON.parse(text);

      return NextResponse.json({
        success: true,
        data: {
          meetingId,
          modelUsed: 'gemini-2.0-flash',
          ...parsed,
        },
      });
    } catch (geminiError) {
      console.warn('Gemini process-audio failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);
    }

    // 2. Fallback to NVIDIA
    // Using Moonshot Kimi-K2 for meeting notes (fast and high capacity).
    const nvidiaPrompt = `You are a specialized JSON generator for meeting summaries.
${audio ? 'IMPORTANT: Audio transcription is currently unavailable due to system quota. Process ONLY the whiteboard notes and canvas data below.' : ''}

Shared Whiteboard Notes:
${boardText || 'No whiteboard notes provided.'}

Canvas drawing data (serialized JSON):
${canvasData || 'No canvas data provided.'}

Return a single JSON object with this exact structure:
{
  "transcript": "${audio ? 'Audio transcription unavailable (Quota Exceeded). Processing whiteboard/canvas notes only.' : 'No audio provided.'}",
  "summaryNotes": "Detailed summary here...",
  "implementationPlan": "Short Implementation Plan here...",
  "futureAgenda": ["item1", "item2"],
  "futureScopes": ["scope1"],
  "promises": ["task1"]
}

Rules:
- Output ONLY the JSON object.
- No conversational text, no markdown code blocks, just the raw JSON.
- Ensure all fields are present.`;

    const parsed = await callNvidiaJSON(nvidiaPrompt, { model: 'kimi', temperature: 0.1 });

    return NextResponse.json({
      success: true,
      data: {
        meetingId,
        modelUsed: 'nvidia/moonshot-kimi-k2',
        ...parsed,
      },
    });
  } catch (error) {
    console.error('Error processing meeting audio:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
