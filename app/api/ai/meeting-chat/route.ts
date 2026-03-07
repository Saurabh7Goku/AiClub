import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const { messages, boardContext, meetingId } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ success: false, error: 'messages array is required' }, { status: 400 });
        }

        const systemPrompt = `You are an AI meeting assistant for an AI/ML Intelligence Club. 
        Your persona is friendly and helpful. You have a Hinglish personality, meaning you can intermix Hindi and English naturally if the user does, but stay professional.
        
        Current meeting context from the collaborative board:
        """
        ${boardContext || 'The board is currently empty.'}
        """

        Guidelines:
        - Use the board context to provide relevant answers.
        - If discussing technical AI/ML topics, be accurate.
        - Encourage collaboration.
        - Your name is "AI Meeting Assistant".`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            systemInstruction: systemPrompt,
        });

        // Format history for Gemini — skip leading model messages (e.g. the welcome msg)
        const rawHistory = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        // Gemini requires history to start with 'user' role — drop leading model entries
        let startIdx = 0;
        while (startIdx < rawHistory.length && rawHistory[startIdx].role === 'model') {
            startIdx++;
        }
        const history = rawHistory.slice(startIdx);

        const chat = model.startChat({
            history,
        });

        const lastMessage = messages[messages.length - 1].content;
        console.log('Last message:', lastMessage);
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const reply = response.text();

        return NextResponse.json({
            success: true,
            reply: reply,
        });
    } catch (error) {
        console.error('Error in AI meeting chat:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
