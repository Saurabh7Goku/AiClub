import { NextResponse } from 'next/server';
import {
    sendTeamsNotification,
    formatMeetingStartCard,
    formatMeetingEndCard,
    formatIdeaCard,
} from '@/lib/integrations/teams';
import {
    sendSlackNotification,
    formatMeetingStartBlocks,
    formatMeetingEndBlocks,
    formatIdeaBlocks,
} from '@/lib/integrations/slack';

interface NotifyPayload {
    clubId: string;
    clubName: string;
    eventType: 'meeting_started' | 'meeting_ended' | 'new_idea' | 'idea_approved' | 'idea_rejected';
    // Meeting fields
    roomName?: string;
    startedBy?: string;
    meetingUrl?: string;
    summary?: string;
    notesUrl?: string;
    // Idea fields
    ideaTitle?: string;
    submittedBy?: string;
    ideaUrl?: string;
    // Webhook URLs (passed from client or loaded server-side)
    teamsWebhookUrl?: string;
    slackWebhookUrl?: string;
}

export async function POST(request: Request) {
    try {
        const secret = request.headers.get('x-webhook-secret');
        const configuredSecret = process.env.INTEGRATION_WEBHOOK_SECRET;

        // Validate secret if configured
        if (configuredSecret && secret !== configuredSecret) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Invalid webhook secret' },
                { status: 401 }
            );
        }

        const payload: NotifyPayload = await request.json();

        if (!payload.clubId || !payload.eventType) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: clubId, eventType' },
                { status: 400 }
            );
        }

        const results: { teams?: boolean; slack?: boolean } = {};
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // ==================== TEAMS ====================
        if (payload.teamsWebhookUrl) {
            let card;

            switch (payload.eventType) {
                case 'meeting_started':
                    card = formatMeetingStartCard(
                        payload.roomName || 'Meeting Room',
                        payload.startedBy || 'Unknown',
                        payload.clubName,
                        payload.meetingUrl || `${baseUrl}/meetings`
                    );
                    break;

                case 'meeting_ended':
                    card = formatMeetingEndCard(
                        payload.roomName || 'Meeting Room',
                        payload.clubName,
                        payload.summary || 'No summary available.',
                        payload.notesUrl || `${baseUrl}/meetings/notes`
                    );
                    break;

                case 'new_idea':
                case 'idea_approved':
                case 'idea_rejected': {
                    const action = payload.eventType === 'new_idea' ? 'new'
                        : payload.eventType === 'idea_approved' ? 'approved' : 'rejected';
                    card = formatIdeaCard(
                        payload.ideaTitle || 'Untitled Idea',
                        action,
                        payload.submittedBy || 'Unknown',
                        payload.clubName,
                        payload.ideaUrl || `${baseUrl}/ideas`
                    );
                    break;
                }
            }

            if (card) {
                results.teams = await sendTeamsNotification(payload.teamsWebhookUrl, card);
            }
        }

        // ==================== SLACK ====================
        if (payload.slackWebhookUrl) {
            let message;

            switch (payload.eventType) {
                case 'meeting_started':
                    message = formatMeetingStartBlocks(
                        payload.roomName || 'Meeting Room',
                        payload.startedBy || 'Unknown',
                        payload.clubName,
                        payload.meetingUrl || `${baseUrl}/meetings`
                    );
                    break;

                case 'meeting_ended':
                    message = formatMeetingEndBlocks(
                        payload.roomName || 'Meeting Room',
                        payload.clubName,
                        payload.summary || 'No summary available.',
                        payload.notesUrl || `${baseUrl}/meetings/notes`
                    );
                    break;

                case 'new_idea':
                case 'idea_approved':
                case 'idea_rejected': {
                    const action = payload.eventType === 'new_idea' ? 'new'
                        : payload.eventType === 'idea_approved' ? 'approved' : 'rejected';
                    message = formatIdeaBlocks(
                        payload.ideaTitle || 'Untitled Idea',
                        action,
                        payload.submittedBy || 'Unknown',
                        payload.clubName,
                        payload.ideaUrl || `${baseUrl}/ideas`
                    );
                    break;
                }
            }

            if (message) {
                results.slack = await sendSlackNotification(payload.slackWebhookUrl, message);
            }
        }

        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Integration notify error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to send notification' },
            { status: 500 }
        );
    }
}
