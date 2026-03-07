import { NextResponse } from 'next/server';
import { refreshNewsCache } from '@/lib/services/newsService';
import { getLastSyncTimestamp, setLastSyncTimestamp } from '@/lib/firebase/admin-firestore';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// In-memory fast-path to avoid a Firestore read on every request within the same process
let cachedLastSyncedAt: number | null = null;
let isSyncing = false;

export async function POST() {
    const now = Date.now();

    // ── Concurrent-request lock ──
    if (isSyncing) {
        return NextResponse.json({
            success: false,
            message: 'A synchronization is already in progress. Please wait.',
            newItems: 0,
        }, { status: 429 });
    }

    // ── Read last sync time (memory fast-path, then Firestore fallback) ──
    if (cachedLastSyncedAt === null) {
        cachedLastSyncedAt = await getLastSyncTimestamp();
    }

    const timeSinceLastSync = now - cachedLastSyncedAt;

    // ── Daily rate limit: refuse if synced less than 24 hours ago ──
    if (cachedLastSyncedAt > 0 && timeSinceLastSync < ONE_DAY_MS) {
        const nextSyncInHours = Math.ceil((ONE_DAY_MS - timeSinceLastSync) / (1000 * 60 * 60));
        return NextResponse.json({
            success: true,
            message: `Intelligence streams are up to date. Next sync available in ~${nextSyncInHours}h.`,
            newItems: 0,
            nextSyncInMs: ONE_DAY_MS - timeSinceLastSync,
        });
    }

    try {
        isSyncing = true;
        const result = await refreshNewsCache();

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: 'Intelligence retrieval protocol failed.',
            }, { status: 500 });
        }

        // Persist timestamp to Firestore + update in-memory cache
        await setLastSyncTimestamp();
        cachedLastSyncedAt = Date.now();

        return NextResponse.json({
            success: true,
            message: result.newItems > 0
                ? `Successfully ingested ${result.newItems} new intelligence signals.`
                : 'Intelligence streams are synchronized. No new signals detected.',
            items: [],
            newItems: result.newItems,
        });
    } catch (error) {
        console.error('Failed to sync tech feed:', error);
        return NextResponse.json({
            success: false,
            error: 'Intelligence retrieval protocol failed.',
        }, { status: 500 });
    } finally {
        isSyncing = false;
    }
}

// Allow GET for manual debugging
export async function GET() {
    return POST();
}
