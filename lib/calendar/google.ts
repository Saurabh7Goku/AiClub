/**
 * Google Calendar Integration
 *
 * Uses Google Calendar API (free tier: 10,000 requests/day)
 * with OAuth2 for user authentication and event management.
 */

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ==================== OAUTH ====================

/**
 * Generate Google OAuth2 authorization URL
 */
export function getGoogleAuthUrl(redirectUri: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        state: 'google_calendar',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeGoogleCode(
    code: string,
    redirectUri: string
): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google OAuth token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
    };
}

/**
 * Refresh an expired access token
 */
export async function refreshGoogleToken(
    refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to refresh Google token');
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
    };
}

// ==================== CALENDAR EVENTS ====================

export interface GoogleCalendarEvent {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    location?: string;
    attendees?: Array<{ email: string }>;
    conferenceData?: any;
}

/**
 * Create a new Google Calendar event
 */
export async function createGoogleEvent(
    accessToken: string,
    event: GoogleCalendarEvent,
    calendarId: string = 'primary'
): Promise<{ id: string; htmlLink: string }> {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Google Calendar event: ${error}`);
    }

    const data = await response.json();
    return { id: data.id, htmlLink: data.htmlLink };
}

/**
 * Update an existing Google Calendar event
 */
export async function updateGoogleEvent(
    accessToken: string,
    eventId: string,
    updates: Partial<GoogleCalendarEvent>,
    calendarId: string = 'primary'
): Promise<void> {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update Google Calendar event');
    }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteGoogleEvent(
    accessToken: string,
    eventId: string,
    calendarId: string = 'primary'
): Promise<void> {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok && response.status !== 410) {
        throw new Error('Failed to delete Google Calendar event');
    }
}
