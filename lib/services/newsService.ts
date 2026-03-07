import Parser from 'rss-parser';
import { TechFeedItem, TechFeedCategory, User } from '@/types';
import { getTechFeedAdmin, addTechFeedItemAdmin, pruneOldTechFeedItems } from '@/lib/firebase/admin-firestore';
import { createHash } from 'crypto';

/**
 * Generates a consistent, Firestore-safe document ID from a URL.
 */
function getDocIdForUrl(url: string): string {
    return createHash('md5').update(url).digest('hex');
}

/**
 * Strips HTML tags and decodes common entities to sanitize feed content.
 */
function cleanHtml(html?: string): string {
    if (!html) return '';
    let text = html.replace(/<[^>]*>?/gm, ' ');
    text = text.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8217;/g, "'")
        .replace(/&#822[01]/g, '"')
        .replace(/&#8211;/g, '-');
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parser for XML feeds (like ArXiv)
 */
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 15000,
});

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Refresh every 24 hours (NewsAPI daily limit)
const MAX_CACHED_ITEMS = 500;

// Intelligence Signal Scoring
const SOURCE_WEIGHTS: Record<string, number> = {
    'arXiv': 100,
    'DeepMind': 95,
    'OpenAI': 95,
    'Anthropic': 95,
    'MIT Technology Review': 90,
    'Nature': 90,
    'Science': 90,
    'HackerNews': 85,
    'Dev.to': 75,
    'The Verge': 60,
    'TechCrunch': 80,
    'Wired': 65
};

// --- In-memory cache ---
let newsCache: {
    items: TechFeedItem[];
    lastFetchedAt: number;
    lastLoadedAt: number;
} = {
    items: [],
    lastFetchedAt: 0,
    lastLoadedAt: 0
};

/**
 * Check if cache is valid (not older than CACHE_DURATION)
 */
function isCacheValid(): boolean {
    return Date.now() - newsCache.lastFetchedAt < CACHE_DURATION && newsCache.items.length > 0;
}

// --- NEWS AGGREGATORS ---

/**
 * Ingest from ArXiv (Research Papers)
 */
async function fetchArxivResearch(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    const url = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:stat.ML&sortBy=lastUpdatedDate&max_results=20';
    try {
        const feed = await parser.parseURL(url);
        return (feed.items || []).map(item => ({
            title: cleanHtml(item.title),
            summary: cleanHtml(item.summary || item.contentSnippet || '')?.slice(0, 300) + '...',
            sourceUrl: item.link || item.id || '',
            category: 'Research' as TechFeedCategory,
            sourceName: 'arXiv',
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
    } catch (error) {
        console.warn('Failed to fetch from arXiv:', error);
        return [];
    }
}

/**
 * Ingest from NewsAPI.org (General AI/ML News)
 * Use as fallback or primary depending on provided key.
 */
async function fetchNewsAPI(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) return [];

    const query = encodeURIComponent('AI OR "artificial intelligence" OR "machine learning" OR "deep learning" OR GPT');
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=40&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        return (data.articles || []).map((article: any) => ({
            title: cleanHtml(article.title),
            summary: cleanHtml(article.description || article.content || '').slice(0, 300) + '...',
            sourceUrl: article.url,
            category: 'Industry' as TechFeedCategory,
            sourceName: article.source.name,
            publishedAt: new Date(article.publishedAt || Date.now()),
        }));
    } catch (error) {
        console.warn('Failed to fetch from NewsAPI:', error);
        return [];
    }
}

/**
 * Ingest from Developer Community (Tools / Infra)
 */
async function fetchDevTo(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    const url = 'https://dev.to/feed/';
    try {
        const feed = await parser.parseURL(url);
        return (feed.items || []).slice(0, 15).map(item => ({
            title: cleanHtml(item.title),
            summary: cleanHtml(item.contentSnippet || item.summary || '').slice(0, 300) + '...',
            sourceUrl: item.link || '',
            category: 'Tools' as TechFeedCategory,
            sourceName: 'Dev.to',
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
    } catch (error) {
        console.warn('Failed to fetch from Dev.to:', error);
        return [];
    }
}

/**
 * Ingest from HackerNews RSS (Industry)
 */
async function fetchHackerNews(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    const url = 'https://hnrss.org/frontpage';
    try {
        const feed = await parser.parseURL(url);
        return (feed.items || []).slice(0, 15).map(item => ({
            title: cleanHtml(item.title),
            summary: cleanHtml(item.contentSnippet || item.summary || '').slice(0, 300) + '...',
            sourceUrl: item.link || '',
            category: 'Industry' as TechFeedCategory,
            sourceName: 'HackerNews',
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
    } catch (error) {
        console.warn('Failed to fetch from HackerNews:', error);
        return [];
    }
}

/**
 * Ingest from TechCrunch RSS (Industry)
 */
async function fetchTechCrunch(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    const url = 'https://techcrunch.com/feed/';
    try {
        const feed = await parser.parseURL(url);
        return (feed.items || []).slice(0, 15).map(item => ({
            title: cleanHtml(item.title),
            summary: cleanHtml(item.contentSnippet || item.summary || '').slice(0, 300) + '...',
            sourceUrl: item.link || '',
            category: 'Industry' as TechFeedCategory,
            sourceName: 'TechCrunch',
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
    } catch (error) {
        console.warn('Failed to fetch from TechCrunch:', error);
        return [];
    }
}

/**
 * Core Orchestrator: Fetch fresh news from all aggregate sources
 */
export async function fetchFreshNews(): Promise<Omit<TechFeedItem, 'id' | 'ingestedAt'>[]> {
    console.log('Ingesting global tech intelligence from aggregate streams...');

    // Fetch in parallel
    const [arxivItems, newsItems, devToItems, hnItems, tcItems] = await Promise.all([
        fetchArxivResearch(),
        fetchNewsAPI(),
        fetchDevTo(),
        fetchHackerNews(),
        fetchTechCrunch()
    ]);

    const allItems = [...arxivItems, ...newsItems, ...devToItems, ...hnItems, ...tcItems];
    console.log(`Aggregated ${allItems.length} raw signals.`);

    // Pre-filtering: Ensure we have titles and valid URLs
    return allItems.filter(item => item.title && item.sourceUrl);
}

// --- STORAGE & CACHING ---

/**
 * Load cached news from Firestore using Admin SDK
 */
async function loadCachedNews(): Promise<TechFeedItem[]> {
    try {
        const cachedItems = await getTechFeedAdmin(MAX_CACHED_ITEMS);
        return cachedItems;
    } catch (error) {
        console.error('Failed to load cached news:', error);
        return [];
    }
}

/**
 * Store fresh news in Firestore
 */
async function storeNewsInCache(newItems: Omit<TechFeedItem, 'id' | 'ingestedAt'>[]): Promise<void> {
    try {
        let addedCount = 0;
        let skippedCount = 0;

        for (const item of newItems) {
            try {
                const docId = await addTechFeedItemAdmin(item);
                if (docId) addedCount++;
                else skippedCount++;

                if (addedCount >= 40) break; // Ingest throttle
            } catch (error) {
                // Ignore single item failures
            }
        }
        console.log(`Synchronized: ${addedCount} new signals, ${skippedCount} existing.`);
    } catch (error) {
        console.error('Failed to store news in cache:', error);
    }
}

/**
 * Public API: Get news with robust caching
 */
export async function getLatestNews(forceRefresh: boolean = false): Promise<TechFeedItem[]> {
    const now = Date.now();

    // 1. Memory Cache Hit
    if (isCacheValid() && !forceRefresh) {
        return newsCache.items;
    }

    // 2. DB Cache Hit (Rapid recovery on cold start)
    const dbLoadFresh = (now - newsCache.lastLoadedAt) < 5 * 60 * 1000;
    if (!forceRefresh && newsCache.items.length === 0 && !dbLoadFresh) {
        const cachedItems = await loadCachedNews();
        if (cachedItems.length > 0) {
            newsCache.items = cachedItems;
            newsCache.lastLoadedAt = now;
            newsCache.lastFetchedAt = now; // Prevent instant hammering
            return cachedItems;
        }
    }

    // 3. Remote Ingestion
    try {
        const freshItems = await fetchFreshNews();
        if (freshItems.length > 0) {
            // Background storage
            storeNewsInCache(freshItems).catch(e => console.error('BG storage failed:', e));

            // Memory Deduplication & Scoring
            const uniqueMap = new Map<string, TechFeedItem>();
            newsCache.items.forEach(item => uniqueMap.set(item.id, item));

            freshItems.forEach(item => {
                const id = getDocIdForUrl(item.sourceUrl);
                uniqueMap.set(id, { ...item, id, ingestedAt: new Date() });
            });

            // Ranking & Selection
            const rankedList = Array.from(uniqueMap.values())
                .sort((a, b) => {
                    const weightA = SOURCE_WEIGHTS[a.sourceName] || 50;
                    const weightB = SOURCE_WEIGHTS[b.sourceName] || 50;
                    if (weightA !== weightB) return weightB - weightA;
                    return b.publishedAt.getTime() - a.publishedAt.getTime();
                })
                .slice(0, MAX_CACHED_ITEMS);

            newsCache.items = rankedList;
            newsCache.lastFetchedAt = now;
            newsCache.lastLoadedAt = now;
            return rankedList;
        }
        return newsCache.items;
    } catch (error) {
        console.error('Fetch failed:', error);
        return newsCache.items;
    }
}

/**
 * Personalized ranking: Sort items based on user expertise and interests
 */
export async function getRecommendedNews(user: User, limitCount: number = 10): Promise<TechFeedItem[]> {
    const allNews = await getLatestNews();
    if (!user.profile?.expertise || user.profile.expertise.length === 0) {
        return allNews.slice(0, limitCount);
    }

    const expertise = user.profile.expertise.map(e => e.toLowerCase());

    return allNews
        .map(item => {
            let score = 0;
            const title = item.title.toLowerCase();
            const summary = item.summary.toLowerCase();
            const category = item.category.toLowerCase();

            // Category match (Strong boost)
            if (expertise.includes(category)) {
                score += 100;
            }

            // Keyword match in title/summary (Moderate boost)
            expertise.forEach(skill => {
                if (title.includes(skill)) score += 50;
                if (summary.includes(skill)) score += 20;
            });

            // Source quality
            score += (SOURCE_WEIGHTS[item.sourceName] || 50) / 2;

            // Recency (Freshness matters)
            const hoursOld = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
            score += Math.max(0, 50 - hoursOld);

            return { item, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(x => x.item)
        .slice(0, limitCount);
}

/**
 * Weekly Digest Data aggregation
 */
export async function getWeeklyDigestData(): Promise<TechFeedItem[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allNews = await getLatestNews();

    // Filter by date and rank by quality/source
    return allNews
        .filter(item => item.publishedAt >= oneWeekAgo)
        .sort((a, b) => {
            const weightA = SOURCE_WEIGHTS[a.sourceName] || 50;
            const weightB = SOURCE_WEIGHTS[b.sourceName] || 50;
            return weightB - weightA;
        })
        .slice(0, 15);
}

/**
 * Forced sync trigger
 */
export async function refreshNewsCache(): Promise<{ success: boolean; newItems: number }> {
    try {
        const freshItems = await fetchFreshNews();
        if (freshItems.length > 0) {
            await storeNewsInCache(freshItems);

            const uniqueMap = new Map<string, TechFeedItem>();
            newsCache.items.forEach(item => uniqueMap.set(item.id, item));

            freshItems.forEach(item => {
                const id = getDocIdForUrl(item.sourceUrl);
                uniqueMap.set(id, { ...item, id, ingestedAt: new Date() });
            });

            const rankedList = Array.from(uniqueMap.values())
                .sort((a, b) => {
                    const weightA = SOURCE_WEIGHTS[a.sourceName] || 50;
                    const weightB = SOURCE_WEIGHTS[b.sourceName] || 50;
                    if (weightA !== weightB) return weightB - weightA;
                    return b.publishedAt.getTime() - a.publishedAt.getTime();
                })
                .slice(0, MAX_CACHED_ITEMS);

            newsCache.items = rankedList;
            newsCache.lastFetchedAt = Date.now();
            newsCache.lastLoadedAt = Date.now();

            // Background Eviction
            pruneOldTechFeedItems(200).catch(e => console.error('Pruning failed:', e));

            return { success: true, newItems: freshItems.length };
        }
        return { success: true, newItems: 0 };
    } catch (error) {
        console.error('Refresh failed:', error);
        return { success: false, newItems: 0 };
    }
}

export function shouldRefreshNews(): boolean {
    return Date.now() - newsCache.lastFetchedAt >= CACHE_DURATION;
}

export async function getCacheStatus() {
    return {
        itemCount: newsCache.items.length,
        lastFetchedAt: new Date(newsCache.lastFetchedAt).toISOString(),
        lastLoadedAt: new Date(newsCache.lastLoadedAt).toISOString(),
        cacheAge: Date.now() - newsCache.lastFetchedAt,
        cacheValid: isCacheValid(),
        digestCount: (await getWeeklyDigestData()).length
    };
}
