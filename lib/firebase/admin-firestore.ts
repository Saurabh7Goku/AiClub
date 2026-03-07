/**
 * Server-side only Firestore helpers using Firebase Admin SDK.
 * These bypass Firestore security rules and should ONLY be used in API routes / server code.
 */
import { getAdminDb } from './admin';
import { FieldValue, Timestamp, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { TechFeedItem, User } from '@/types';
import { createHash } from 'crypto';

/**
 * Generates a consistent, Firestore-safe document ID from a URL.
 */
function getDocIdForUrl(url: string): string {
    return createHash('md5').update(url).digest('hex');
}

/**
 * Safely parse a Firestore Timestamp, numeric milliseconds, or ISO string to a Date object.
 */
function parseTimestampAdmin(val: any): Date {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') return new Date(val);
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date();
}

/**
 * Add a tech feed item to Firestore using the Admin SDK (bypasses security rules).
 * Deduplicates by sourceUrl to avoid re-inserting the same article.
 */
export async function addTechFeedItemAdmin(
    item: Omit<TechFeedItem, 'id' | 'ingestedAt'>
): Promise<string | null> {
    const docId = getDocIdForUrl(item.sourceUrl);
    const docRef = getAdminDb().collection('tech_feed').doc(docId);

    try {
        // Use create() to fail if it already exists, or just set() to overwrite/update
        // We use create() here so we know if we actually added a NEW item
        await docRef.create({
            title: item.title,
            summary: item.summary,
            sourceUrl: item.sourceUrl,
            category: item.category,
            sourceName: item.sourceName,
            publishedAt: Timestamp.fromDate(item.publishedAt),
            ingestedAt: FieldValue.serverTimestamp(),
        });
        return docId;
    } catch (error: any) {
        // Code 6 is ALREADY_EXISTS. This is expected if the article was already synced.
        if (error.code === 6) {
            return null;
        }
        throw error;
    }
}

/**
 * Prune old tech feed items — keep only the most recent `keepCount` items.
 */
export async function pruneOldTechFeedItems(keepCount: number = 500): Promise<void> {
    const feedRef = getAdminDb().collection('tech_feed');
    const all = await feedRef.orderBy('publishedAt', 'desc').get();

    if (all.size <= keepCount) return;

    const toDelete = all.docs.slice(keepCount);
    const batchSize = 400; // Firestore batch limit is 500

    for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = getAdminDb().batch();
        toDelete.slice(i, i + batchSize).forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));
        await batch.commit();
    }
}

/**
 * Get tech feed items using the Admin SDK (bypasses security rules).
 */
export async function getTechFeedAdmin(limitCount: number = 500): Promise<TechFeedItem[]> {
    const feedRef = getAdminDb().collection('tech_feed');
    const snapshot = await feedRef.orderBy('publishedAt', 'desc').limit(limitCount).get();
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            publishedAt: parseTimestampAdmin(data.publishedAt),
            ingestedAt: parseTimestampAdmin(data.ingestedAt),
        } as TechFeedItem;
    });
}

/**
 * Get a user profile using the Admin SDK.
 */
export async function getUserAdmin(uid: string): Promise<User | null> {
    const userDoc = await getAdminDb().collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    
    const data = userDoc.data();
    return {
        ...data,
        createdAt: parseTimestampAdmin(data?.createdAt),
        lastActive: parseTimestampAdmin(data?.lastActive)
    } as User;
}

const SYNC_CONFIG_DOC = 'tech_feed_sync';

/**
 * Read the last successful sync timestamp from Firestore config.
 * Returns 0 if no sync has ever been recorded.
 */
export async function getLastSyncTimestamp(): Promise<number> {
    try {
        const doc = await getAdminDb().collection('config').doc(SYNC_CONFIG_DOC).get();
        if (!doc.exists) return 0;
        const ts = doc.data()?.lastSyncedAt;
        if (ts instanceof Timestamp) return ts.toMillis();
        if (typeof ts === 'number') return ts;
        return 0;
    } catch {
        return 0;
    }
}

/**
 * Persist the current time as the last successful sync timestamp.
 */
export async function setLastSyncTimestamp(): Promise<void> {
    await getAdminDb()
        .collection('config')
        .doc(SYNC_CONFIG_DOC)
        .set({ lastSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
}
