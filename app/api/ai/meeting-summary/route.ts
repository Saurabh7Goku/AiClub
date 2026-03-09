import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
        const { messages, boardContent } = await request.json();

        const prompt = `You are an AI meeting assistant. Based on the chat history and the current collaborative board content, generate a concise set of structured summary notes.
        
        CHAT HISTORY:
        ${messages?.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n') || 'No chat history.'}

        CURRENT BOARD CONTENT:
        ${boardContent || 'The board is empty.'}

        Instructions:
        1. Summarize the key discussion points and conclusions.
        2. Format the output with clear headings using Markdown-like syntax (suitable for a Rich Text editor).
        3. Use bullet points for readability.
        4. Focus on clarity and actionability.
        5. Return ONLY the summary text, no conversational filler.`;

        // 1. Try Gemini first
        try {
            const apiKey = getApiKey();
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash-lite',
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const summary = response.text();

            return NextResponse.json({
                success: true,
                summary: summary,
            });
        } catch (geminiError) {
            console.warn('Gemini meeting-summary failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);
        }

        // 2. Fallback to NVIDIA (Kimi-K2)
        const summary = await callNvidia(prompt, { model: 'kimi', temperature: 0.15 });

        return NextResponse.json({
            success: true,
            summary: summary,
            modelUsed: 'nvidia/moonshot-kimi-k2',
        });
    } catch (error) {
        console.error('Error generating meeting summary:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
