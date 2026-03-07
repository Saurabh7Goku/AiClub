import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
};

const meetingOutputSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    transcript: { type: SchemaType.STRING, description: "A transcript of the audio, if any" },
    summaryNotes: { type: SchemaType.STRING, description: "Detailed summary of the meeting, encompassing audio, whiteboard notes and drawings" },
    futureAgenda: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Suggested agenda items for the next meeting" },
    futureScopes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Future scopes or big picture goals identified" },
    promises: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Action items or promises made by participants" },
  },
  required: ['transcript', 'summaryNotes', 'futureAgenda', 'futureScopes', 'promises'],
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();

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

    let upload: any = null;
    if (audio && audio instanceof File) {
      const ab = await audio.arrayBuffer();
      const buf = Buffer.from(ab);
      const fileManager = new GoogleAIFileManager(apiKey);
      upload = await fileManager.uploadFile(buf, {
        mimeType: audio.type || 'audio/webm',
        displayName: `meeting_${meetingId}.webm`,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: meetingOutputSchema,
      },
    });

    const prompt = `You are an AI meeting assistant. You are given a meeting context containing either an audio recording, written notes from a shared whiteboard, or both.

Shared Whiteboard Notes:
${boardText || 'No whiteboard notes provided.'}

Canvas drawing data (serialized JSON):
${canvasData || 'No canvas data provided.'}

Tasks:
1) If audio is provided, transcribe it. Otherwise just return 'No audio provided.'
2) Produce a comprehensive summary of the meeting, merging insights from the audio and the whiteboard notes.
3) Extract any items that should be added to a future agenda.
4) Extract broad future scopes or long-term goals discussed.
5) Extract final promises, commitments, and action items made by participants.

Return ONLY valid JSON matching the provided schema.`;

    const requestPayload: any[] = [{ text: prompt }];
    if (upload) {
      requestPayload.push({
        fileData: {
          mimeType: audio instanceof File ? audio.type || 'audio/webm' : 'audio/webm',
          fileUri: upload.file.uri,
        },
      });
    }

    const result = await model.generateContent(requestPayload);

    const text = result.response.text();
    const parsed = JSON.parse(text) as {
      transcript: string;
      summaryNotes: string;
      futureAgenda: string[];
      futureScopes: string[];
      promises: string[];
    };

    return NextResponse.json({
      success: true,
      data: {
        meetingId,
        modelUsed: 'gemini-2.0-flash',
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
