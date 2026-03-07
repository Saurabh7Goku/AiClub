import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { AIDraft, FeasibilityNotes } from '@/types';

// Initialize Gemini
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Schema for structured AI draft output
const aiDraftSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    refinedDescription: {
      type: SchemaType.STRING,
      description: 'A refined and expanded description of the idea',
    },
    architectureOutline: {
      type: SchemaType.STRING,
      description: 'High-level technical architecture outline for implementing this idea',
    },
    discussionAgenda: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'List of discussion points for the meeting',
    },
    feasibilityNotes: {
      type: SchemaType.OBJECT,
      properties: {
        technical: {
          type: SchemaType.STRING,
          description: 'Technical feasibility assessment',
        },
        operational: {
          type: SchemaType.STRING,
          description: 'Operational feasibility assessment',
        },
        risks: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'List of potential risks and mitigations',
        },
      },
      required: ['technical', 'operational', 'risks'],
    },
    nextSteps: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Recommended next steps for implementation',
    },
  },
  required: ['refinedDescription', 'architectureOutline', 'discussionAgenda', 'feasibilityNotes', 'nextSteps'],
};

// Schema for meeting agenda
const meetingAgendaSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    agenda: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Ordered list of agenda items for the meeting',
    },
    discussionPoints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Key points to discuss for each agenda item',
    },
    decisionPoints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Decisions that need to be made during the meeting',
    },
    timeAllocation: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          minutes: { type: SchemaType.NUMBER },
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
    const genAI = getGeminiClient();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: aiDraftSchema,
      },
    });

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

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

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
  } catch (error) {
    console.error('Error generating AI draft:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate AI draft',
    };
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
    const genAI = getGeminiClient();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: meetingAgendaSchema,
      },
    });

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

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsed = JSON.parse(text) as MeetingAgendaOutput;

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error('Error generating meeting agenda:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate meeting agenda',
    };
  }
}

// Summarize tech article
export async function summarizeTechArticle(
  title: string,
  content: string
): Promise<AIGenerationResult<string>> {
  try {
    const genAI = getGeminiClient();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
    });

    const prompt = `Summarize the following AI/ML technology article in 2-3 sentences. Focus on the key innovation or update.

Title: ${title}
Content: ${content}

Provide a concise summary suitable for a tech feed display.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    console.error('Error summarizing article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize article',
    };
  }
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey !== 'your_gemini_api_key_here';
}