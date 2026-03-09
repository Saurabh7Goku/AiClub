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
        const ai = new GoogleGenAI({ apiKey });

        const form = await request.formData();
        const meetingId = form.get('meetingId');
        const audio = form.get('audio');

        if (!meetingId || typeof meetingId !== 'string') {
            return NextResponse.json({ success: false, error: 'meetingId is required' }, { status: 400 });
        }

        if (!audio || !(audio instanceof File)) {
            return NextResponse.json({ success: false, error: 'audio file is required' }, { status: 400 });
        }

        // Upload the audio file using the new SDK
        const upload = await ai.files.upload({
            file: audio,
            config: {
                mimeType: audio.type || 'audio/webm',
                displayName: `meeting_raw_${meetingId}.webm`,
            },
        });

        const prompt = `You are an AI meeting transcriber. Transcribe the provided audio exactly as it is spoken. 
    Maintain speaker turns if identifiable, but prioritize accuracy of every word.
    Return ONLY the raw transcript text.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            fileData: {
                                mimeType: audio.type || 'audio/webm',
                                fileUri: upload.uri!,
                            },
                        },
                    ],
                },
            ],
        });

        const transcript = result.text ?? '';

        return NextResponse.json({
            success: true,
            data: {
                meetingId,
                transcript,
            },
        });
    } catch (error) {
        console.error('Error transcribing meeting audio:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
