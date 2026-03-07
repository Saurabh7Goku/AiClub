import { NextResponse } from 'next/server';
import { getGoogleAuthUrl, exchangeGoogleCode } from '@/lib/calendar/google';
import { saveCalendarIntegration } from '@/lib/firebase/firestore';

/**
 * GET — Google OAuth callback handler
 * Query params: code, state, userId
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('userId');

    if (!code || !userId) {
        return NextResponse.redirect(
            new URL('/profile?calendar_error=missing_params', request.url)
        );
    }

    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/calendar/google`;

        const tokens = await exchangeGoogleCode(code, redirectUri);
        const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);

        await saveCalendarIntegration(userId, 'google', {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiry,
            calendarId: 'primary',
            syncEnabled: true,
        });

        return NextResponse.redirect(
            new URL('/profile?calendar_connected=google', request.url)
        );
    } catch (error: any) {
        console.error('Google Calendar OAuth error:', error);
        return NextResponse.redirect(
            new URL('/profile?calendar_error=google_failed', request.url)
        );
    }
}

/**
 * POST — Generate Google OAuth URL
 * Body: { userId }
 */
export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/calendar/google?userId=${userId}`;
        const authUrl = getGoogleAuthUrl(redirectUri);

        return NextResponse.json({ success: true, data: { authUrl } });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate auth URL' },
            { status: 500 }
        );
    }
}
