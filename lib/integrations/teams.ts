/**
 * Microsoft Teams — Incoming Webhook Integration
 *
 * Uses the free Teams Incoming Webhook connector to send
 * Adaptive Card notifications for meeting and idea events.
 */

// ==================== CARD BUILDERS ====================

interface AdaptiveCard {
    type: string;
    attachments: Array<{
        contentType: string;
        contentUrl: null;
        content: any;
    }>;
}

function buildAdaptiveCard(body: any[], actions?: any[]): AdaptiveCard {
    return {
        type: 'message',
        attachments: [
            {
                contentType: 'application/vnd.microsoft.card.adaptive',
                contentUrl: null,
                content: {
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    type: 'AdaptiveCard',
                    version: '1.4',
                    body,
                    actions: actions || [],
                },
            },
        ],
    };
}

/**
 * Format a meeting start notification as an Adaptive Card
 */
export function formatMeetingStartCard(
    roomName: string,
    startedBy: string,
    clubName: string,
    meetingUrl: string
): AdaptiveCard {
    return buildAdaptiveCard(
        [
            {
                type: 'ColumnSet',
                columns: [
                    {
                        type: 'Column',
                        width: 'auto',
                        items: [
                            {
                                type: 'Image',
                                url: 'https://adaptivecards.io/content/pending.png',
                                size: 'Small',
                                style: 'Person',
                            },
                        ],
                    },
                    {
                        type: 'Column',
                        width: 'stretch',
                        items: [
                            {
                                type: 'TextBlock',
                                text: `🟢 Meeting Started — ${roomName}`,
                                weight: 'Bolder',
                                size: 'Medium',
                                color: 'Good',
                            },
                            {
                                type: 'TextBlock',
                                text: `**${startedBy}** started a session in **${clubName}**`,
                                spacing: 'None',
                                isSubtle: true,
                                wrap: true,
                            },
                        ],
                    },
                ],
            },
        ],
        [
            {
                type: 'Action.OpenUrl',
                title: 'Join Meeting',
                url: meetingUrl,
            },
        ]
    );
}

/**
 * Format a meeting end notification with summary
 */
export function formatMeetingEndCard(
    roomName: string,
    clubName: string,
    summary: string,
    notesUrl: string
): AdaptiveCard {
    return buildAdaptiveCard([
        {
            type: 'TextBlock',
            text: `🔴 Meeting Ended — ${roomName}`,
            weight: 'Bolder',
            size: 'Medium',
        },
        {
            type: 'TextBlock',
            text: `Session in **${clubName}** has concluded.`,
            isSubtle: true,
            wrap: true,
        },
        {
            type: 'TextBlock',
            text: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
            wrap: true,
            spacing: 'Medium',
        },
    ], [
        {
            type: 'Action.OpenUrl',
            title: 'View Notes',
            url: notesUrl,
        },
    ]);
}

/**
 * Format an idea status update notification
 */
export function formatIdeaCard(
    ideaTitle: string,
    action: 'new' | 'approved' | 'rejected',
    submittedBy: string,
    clubName: string,
    ideaUrl: string
): AdaptiveCard {
    const actionLabels: Record<string, { emoji: string; color: string; text: string }> = {
        new: { emoji: '💡', color: 'Default', text: 'New Idea Submitted' },
        approved: { emoji: '✅', color: 'Good', text: 'Idea Approved' },
        rejected: { emoji: '❌', color: 'Attention', text: 'Idea Rejected' },
    };

    const label = actionLabels[action];

    return buildAdaptiveCard(
        [
            {
                type: 'TextBlock',
                text: `${label.emoji} ${label.text}`,
                weight: 'Bolder',
                size: 'Medium',
                color: label.color,
            },
            {
                type: 'FactSet',
                facts: [
                    { title: 'Idea', value: ideaTitle },
                    { title: 'By', value: submittedBy },
                    { title: 'Club', value: clubName },
                ],
            },
        ],
        [
            {
                type: 'Action.OpenUrl',
                title: 'View Idea',
                url: ideaUrl,
            },
        ]
    );
}

// ==================== SEND NOTIFICATION ====================

/**
 * Send a notification to a Microsoft Teams channel via incoming webhook.
 * Returns true on success, false on failure.
 */
export async function sendTeamsNotification(
    webhookUrl: string,
    card: AdaptiveCard
): Promise<boolean> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(card),
        });

        if (!response.ok) {
            console.error('Teams webhook failed:', response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Teams webhook error:', error);
        return false;
    }
}
