import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

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

        const form = await request.formData();
        const meetingId = form.get('meetingId');
        const audio = form.get('audio');

        if (!meetingId || typeof meetingId !== 'string') {
            return NextResponse.json({ success: false, error: 'meetingId is required' }, { status: 400 });
        }

        if (!audio || !(audio instanceof File)) {
            return NextResponse.json({ success: false, error: 'audio file is required' }, { status: 400 });
        }

        const ab = await audio.arrayBuffer();
        const buf = Buffer.from(ab);

        const fileManager = new GoogleAIFileManager(apiKey);
        const upload = await fileManager.uploadFile(buf, {
            mimeType: audio.type || 'audio/webm',
            displayName: `meeting_raw_${meetingId}.webm`,
        });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `You are an AI meeting transcriber. Transcribe the provided audio exactly as it is spoken. 
    Maintain speaker turns if identifiable, but prioritize accuracy of every word.
    Return ONLY the raw transcript text.`;

        const result = await model.generateContent([
            { text: prompt },
            {
                fileData: {
                    mimeType: audio.type || 'audio/webm',
                    fileUri: upload.file.uri,
                },
            },
        ]);

        const transcript = result.response.text();

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
