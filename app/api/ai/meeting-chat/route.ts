import { GoogleGenAI, Type } from '@google/genai';
import { AIDraft, FeasibilityNotes } from '@/types';
import { callNvidiaJSON } from '@/lib/ai/nvidia';

// Initialize Gemini
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    return new GoogleGenAI({ apiKey });
};

// Schema for structured AI draft output
const aiDraftSchema = {
    type: Type.OBJECT,
    properties: {
        refinedDescription: {
            type: Type.STRING,
            description: 'A refined and expanded description of the idea',
        },
        architectureOutline: {
            type: Type.STRING,
            description: 'High-level technical architecture outline for implementing this idea',
        },
        discussionAgenda: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of discussion points for the meeting',
        },
        feasibilityNotes: {
            type: Type.OBJECT,
            properties: {
                technical: {
                    type: Type.STRING,
                    description: 'Technical feasibility assessment',
                },
                operational: {
                    type: Type.STRING,
                    description: 'Operational feasibility assessment',
                },
                risks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'List of potential risks and mitigations',
                },
            },
            required: ['technical', 'operational', 'risks'],
        },
        nextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Recommended next steps for implementation',
        },
    },
    required: ['refinedDescription', 'architectureOutline', 'discussionAgenda', 'feasibilityNotes', 'nextSteps'],
};

// Schema for meeting agenda
const meetingAgendaSchema = {
    type: Type.OBJECT,
    properties: {
        agenda: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Ordered list of agenda items for the meeting',
        },
        discussionPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Key points to discuss for each agenda item',
        },
        decisionPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Decisions that need to be made during the meeting',
        },
        timeAllocation: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    item: { type: Type.STRING },
                    minutes: { type: Type.NUMBER },
                },
            },
            description: 'Suggested time allocation for each agenda item',
        },
    },
    required: ['agenda', 'discussionPoints', 'decisionPoints', 'timeAllocation'],
};

export interface MeetingAgendaOutput {
    agenda: string[];
    discussionPoints: string[];
    decisionPoints: string[];
    timeAllocation: { item: string; minutes: number }[];
}

export interface AIGenerationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Generate AI draft for an idea
export async function generateAIDraft(
    ideaTitle: string,
    problemStatement: string,
    proposedAiUsage: string,
    category: string
): Promise<AIGenerationResult<Omit<AIDraft, 'id' | 'ideaId' | 'generatedAt'>>> {
    try {
        const ai = getGeminiClient();

        const prompt = `You are an AI/ML technical architect reviewing an idea submission for an AI/ML Intelligence Club.

Idea Title: ${ideaTitle}
Category: ${category}
Problem Statement: ${problemStatement}
Proposed AI Usage: ${proposedAiUsage}

Please analyze this idea and provide:
1. A refined description that clarifies and expands on the original idea
2. A high-level technical architecture outline for implementation
3. A discussion agenda for team review
4. Feasibility notes covering technical viability, operational considerations, and potential risks
5. Recommended next steps

Be specific, practical, and actionable. Consider current AI/ML best practices and available technologies.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiDraftSchema,
            },
        });

        const text = result.text ?? '';
        const parsed = JSON.parse(text) as {
            refinedDescription: string;
            architectureOutline: string;
            discussionAgenda: string[];
            feasibilityNotes: FeasibilityNotes;
            nextSteps: string[];
        };

        return {
            success: true,
            data: {
                refinedDescription: parsed.refinedDescription,
                architectureOutline: parsed.architectureOutline,
                discussionAgenda: parsed.discussionAgenda,
                feasibilityNotes: parsed.feasibilityNotes,
                nextSteps: parsed.nextSteps,
                modelUsed: 'gemini-2.0-flash-lite',
                status: 'success',
            },
        };
    } catch (geminiError) {
        console.warn('Gemini AI draft failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);

        // NVIDIA fallback
        try {
            const nvidiaPrompt = `You are an AI/ML technical architect reviewing an idea submission for an AI/ML Intelligence Club.

Idea Title: ${ideaTitle}
Category: ${category}
Problem Statement: ${problemStatement}
Proposed AI Usage: ${proposedAiUsage}

Please analyze this idea and respond ONLY with a JSON object with these exact keys:
{"refinedDescription": "...", "architectureOutline": "...", "discussionAgenda": ["..."], "feasibilityNotes": {"technical": "...", "operational": "...", "risks": ["..."]}, "nextSteps": ["..."]}

Be specific, practical, and actionable.`;

            const parsed = await callNvidiaJSON<{
                refinedDescription: string;
                architectureOutline: string;
                discussionAgenda: string[];
                feasibilityNotes: FeasibilityNotes;
                nextSteps: string[];
            }>(nvidiaPrompt, { model: 'phi-4', temperature: 0.6 });

            return {
                success: true,
                data: {
                    refinedDescription: parsed.refinedDescription,
                    architectureOutline: parsed.architectureOutline,
                    discussionAgenda: parsed.discussionAgenda,
                    feasibilityNotes: parsed.feasibilityNotes,
                    nextSteps: parsed.nextSteps,
                    modelUsed: 'nvidia/phi-4-mini-flash-reasoning',
                    status: 'success',
                },
            };
        } catch (nvidiaError) {
            console.error('NVIDIA AI draft fallback also failed:', nvidiaError);
            return {
                success: false,
                error: `Gemini: ${geminiError instanceof Error ? geminiError.message : 'unknown'} | NVIDIA: ${nvidiaError instanceof Error ? nvidiaError.message : 'unknown'}`,
            };
        }
    }
}

// Generate meeting agenda for an idea
export async function generateMeetingAgenda(
    ideaTitle: string,
    problemStatement: string,
    refinedDescription: string,
    feasibilityNotes: FeasibilityNotes
): Promise<AIGenerationResult<MeetingAgendaOutput>> {
    try {
        const ai = getGeminiClient();

        const prompt = `You are organizing a meeting to review an AI/ML idea for an Intelligence Club.

Idea Title: ${ideaTitle}
Problem Statement: ${problemStatement}
Refined Description: ${refinedDescription}

Technical Feasibility: ${feasibilityNotes.technical}
Operational Feasibility: ${feasibilityNotes.operational}
Known Risks: ${feasibilityNotes.risks.join(', ')}

Create a structured meeting agenda that:
1. Covers all important aspects of the idea
2. Addresses the feasibility concerns
3. Leads to clear decisions
4. Is realistic for a 60-minute meeting

Provide a well-organized agenda with discussion points and decision points.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: meetingAgendaSchema,
            },
        });

        const text = result.text ?? '';
        const parsed = JSON.parse(text) as MeetingAgendaOutput;

        return {
            success: true,
            data: parsed,
        };
    } catch (geminiError) {
        console.warn('Gemini meeting agenda failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);

        try {
            const nvidiaPrompt = `You are organizing a meeting to review an AI/ML idea for an Intelligence Club.

Idea Title: ${ideaTitle}
Problem Statement: ${problemStatement}
Refined Description: ${refinedDescription}
Technical Feasibility: ${feasibilityNotes.technical}
Operational Feasibility: ${feasibilityNotes.operational}
Known Risks: ${feasibilityNotes.risks.join(', ')}

Create a structured meeting agenda. Respond ONLY with JSON:
{"agenda": ["..."], "discussionPoints": ["..."], "decisionPoints": ["..."], "timeAllocation": [{"item": "...", "minutes": 10}]}

Make it realistic for a 60-minute meeting.`;

            const parsed = await callNvidiaJSON<MeetingAgendaOutput>(nvidiaPrompt, { model: 'phi-4', temperature: 0.6 });

            return {
                success: true,
                data: parsed,
            };
        } catch (nvidiaError) {
            console.error('NVIDIA meeting agenda fallback also failed:', nvidiaError);
            return {
                success: false,
                error: `Gemini: ${geminiError instanceof Error ? geminiError.message : 'unknown'} | NVIDIA: ${nvidiaError instanceof Error ? nvidiaError.message : 'unknown'}`,
            };
        }
    }
}

// Summarize tech article
export async function summarizeTechArticle(
    title: string,
    content: string
): Promise<AIGenerationResult<string>> {
    try {
        const ai = getGeminiClient();

        const prompt = `Summarize the following technology article in 2-3 sentences. Focus on the key innovation or update.

Title: ${title}
Content: ${content}

Provide a concise summary suitable for a tech feed display.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const summary = result.text ?? '';

        return {
            success: true,
            data: summary,
        };
    } catch (geminiError) {
        console.warn('Gemini article summary failed, trying NVIDIA fallback:', geminiError instanceof Error ? geminiError.message : geminiError);

        try {
            const { callNvidia } = await import('@/lib/ai/nvidia');
            const nvidiaPrompt = `Summarize the following AI/ML technology article in 2-3 sentences. Focus on the key innovation or update.

Title: ${title}
Content: ${content}

Provide a concise summary suitable for a tech feed display. Return ONLY the summary text, no JSON.`;

            const summary = await callNvidia(nvidiaPrompt, { model: 'phi-4', temperature: 0.7 });

            return {
                success: true,
                data: summary,
            };
        } catch (nvidiaError) {
            console.error('NVIDIA article summary fallback also failed:', nvidiaError);
            return {
                success: false,
                error: `Gemini: ${geminiError instanceof Error ? geminiError.message : 'unknown'} | NVIDIA: ${nvidiaError instanceof Error ? nvidiaError.message : 'unknown'}`,
            };
        }
    }
}

// Check if AI is configured
export function isAIConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return !!apiKey && apiKey !== 'your_gemini_api_key_here';
}