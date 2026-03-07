/**
 * Slack — Incoming Webhook Integration
 *
 * Uses the free Slack Incoming Webhook to send Block Kit
 * notifications for meeting and idea events.
 */

// ==================== BLOCK BUILDERS ====================

interface SlackMessage {
    text: string; // Fallback text for notifications
    blocks: any[];
}

function divider() {
    return { type: 'divider' };
}

function headerBlock(text: string) {
    return {
        type: 'header',
        text: { type: 'plain_text', text, emoji: true },
    };
}

function sectionBlock(text: string, accessory?: any) {
    const block: any = {
        type: 'section',
        text: { type: 'mrkdwn', text },
    };
    if (accessory) block.accessory = accessory;
    return block;
}

function buttonAccessory(text: string, url: string) {
    return {
        type: 'button',
        text: { type: 'plain_text', text, emoji: true },
        url,
        style: 'primary',
    };
}

function contextBlock(elements: string[]) {
    return {
        type: 'context',
        elements: elements.map((text) => ({
            type: 'mrkdwn',
            text,
        })),
    };
}

// ==================== MESSAGE FORMATTERS ====================

/**
 * Format meeting start notification as Slack blocks
 */
export function formatMeetingStartBlocks(
    roomName: string,
    startedBy: string,
    clubName: string,
    meetingUrl: string
): SlackMessage {
    return {
        text: `🟢 Meeting started in ${roomName} by ${startedBy}`,
        blocks: [
            headerBlock(`🟢 Meeting Started — ${roomName}`),
            sectionBlock(
                `*${startedBy}* started a session in *${clubName}*`,
                buttonAccessory('Join Meeting', meetingUrl)
            ),
            contextBlock([`📍 ${roomName} • ${clubName}`]),
        ],
    };
}

/**
 * Format meeting end notification with summary
 */
export function formatMeetingEndBlocks(
    roomName: string,
    clubName: string,
    summary: string,
    notesUrl: string
): SlackMessage {
    const truncatedSummary = summary.length > 300 ? summary.substring(0, 300) + '...' : summary;

    return {
        text: `🔴 Meeting ended in ${roomName}`,
        blocks: [
            headerBlock(`🔴 Meeting Ended — ${roomName}`),
            sectionBlock(`Session in *${clubName}* has concluded.`),
            divider(),
            sectionBlock(truncatedSummary, buttonAccessory('View Notes', notesUrl)),
        ],
    };
}

/**
 * Format idea status update as Slack blocks
 */
export function formatIdeaBlocks(
    ideaTitle: string,
    action: 'new' | 'approved' | 'rejected',
    submittedBy: string,
    clubName: string,
    ideaUrl: string
): SlackMessage {
    const actionLabels: Record<string, { emoji: string; text: string }> = {
        new: { emoji: '💡', text: 'New Idea Submitted' },
        approved: { emoji: '✅', text: 'Idea Approved' },
        rejected: { emoji: '❌', text: 'Idea Rejected' },
    };

    const label = actionLabels[action];

    return {
        text: `${label.emoji} ${label.text}: ${ideaTitle}`,
        blocks: [
            headerBlock(`${label.emoji} ${label.text}`),
            sectionBlock(
                `*${ideaTitle}*\nSubmitted by ${submittedBy}`,
                buttonAccessory('View Idea', ideaUrl)
            ),
            contextBlock([`🏢 ${clubName}`]),
        ],
    };
}

// ==================== SEND NOTIFICATION ====================

/**
 * Send a notification to a Slack channel via incoming webhook.
 * Returns true on success, false on failure.
 */
export async function sendSlackNotification(
    webhookUrl: string,
    message: SlackMessage
): Promise<boolean> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            console.error('Slack webhook failed:', response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Slack webhook error:', error);
        return false;
    }
}
