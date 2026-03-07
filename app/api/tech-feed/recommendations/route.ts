import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedNews } from '@/lib/services/newsService';
import { getUserAdmin } from '@/lib/firebase/admin-firestore';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    try {
        const user = await getUserAdmin(uid);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const recommendations = await getRecommendedNews(user, 6);
        return NextResponse.json({
            success: true,
            items: recommendations
        });
    } catch (error: any) {
        console.error('Failed to get recommendations:', error);
        return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
    }
}
