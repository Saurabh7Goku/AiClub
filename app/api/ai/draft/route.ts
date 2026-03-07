import { NextRequest, NextResponse } from 'next/server';
import { generateAIDraft } from '@/lib/ai/gemini';
import { getAIDraftForIdea, createAIDraft, getIdea } from '@/lib/firebase/firestore';
import { AIDraft } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId } = body;

    if (!ideaId) {
      return NextResponse.json(
        { success: false, error: 'Idea ID is required' },
        { status: 400 }
      );
    }

    // Get the idea
    const idea = await getIdea(ideaId);
    if (!idea) {
      return NextResponse.json(
        { success: false, error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Check if draft already exists
    const existingDraft = await getAIDraftForIdea(ideaId);
    if (existingDraft) {
      return NextResponse.json({
        success: true,
        data: existingDraft,
        message: 'Draft already exists',
      });
    }

    // Generate AI draft
    const result = await generateAIDraft(
      idea.title,
      idea.problemStatement,
      idea.proposedAiUsage,
      idea.category
    );

    if (!result.success || !result.data) {
      // Create a pending draft
      const pendingDraft: Omit<AIDraft, 'id' | 'ideaId' | 'generatedAt'> = {
        refinedDescription: 'AI draft generation pending. Please try again.',
        architectureOutline: '',
        discussionAgenda: [],
        feasibilityNotes: {
          technical: '',
          operational: '',
          risks: [],
        },
        nextSteps: [],
        modelUsed: 'pending',
        status: 'pending',
      };

      const draft = await createAIDraft(ideaId, pendingDraft);

      return NextResponse.json({
        success: false,
        data: draft,
        error: result.error || 'Failed to generate AI draft',
      });
    }

    // Save the draft
    const draft = await createAIDraft(ideaId, result.data);

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error('Error in AI draft API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get('ideaId');

    if (!ideaId) {
      return NextResponse.json(
        { success: false, error: 'Idea ID is required' },
        { status: 400 }
      );
    }

    const draft = await getAIDraftForIdea(ideaId);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error('Error fetching AI draft:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
