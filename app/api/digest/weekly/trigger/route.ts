import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyDigest } from '@/lib/services/weeklyDigest';

export async function POST(req: NextRequest) {
    // Simple secret check (if configured)
    const authHeader = req.headers.get('authorization');
    const secret = process.env.DIGEST_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await generateWeeklyDigest();
        return NextResponse.json({
            success: true,
            message: 'Weekly digest protocol executed.',
            data: result
        });
    } catch (error) {
        console.error('Digest trigger failed:', error);
        return NextResponse.json({ success: false, error: 'Digest generation failed.' }, { status: 500 });
    }
}

// Allow GET for testing if no secret is set
export async function GET() {
    if (process.env.NODE_ENV === 'production' && process.env.DIGEST_SECRET) {
        return NextResponse.json({ error: 'POST required' }, { status: 405 });
    }
    return POST({ headers: new Headers() } as any);
}
