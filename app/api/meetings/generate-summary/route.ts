import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';

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
        summary: { type: SchemaType.STRING },
        decisions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        actionItems: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        implementationPlan: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        instructions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ['summary', 'decisions', 'actionItems', 'implementationPlan', 'instructions'],
};

export async function POST(request: NextRequest) {
    try {
        const apiKey = getApiKey();
        const { transcript, meetingId } = await request.json();

        if (!transcript) {
            return NextResponse.json({ success: false, error: 'transcript is required' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: meetingOutputSchema,
            },
        });

        const prompt = `You are an AI meeting assistant. Based on this EDITED transcript of a meeting, produce a professional summary and analysis.
    
    TRANSCRIPT:
    ${transcript}

    Tasks:
    1) Produce a concise meeting summary.
    2) Extract final decisions.
    3) Extract action items with clear owner hints if mentioned.
    4) Produce an implementation plan in ordered steps.
    5) Produce detailed instructions for what to do next (checklists).

    Return ONLY valid JSON matching the provided schema.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        return NextResponse.json({
            success: true,
            data: {
                meetingId,
                modelUsed: 'gemini-2.0-flash',
                ...parsed,
            },
        });
    } catch (error) {
        console.error('Error generating meeting summary:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
