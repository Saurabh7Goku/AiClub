'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToTechFeed, getTechFeed } from '@/lib/firebase/firestore';
import { TechFeedItem, TechFeedCategory } from '@/types';
import TechFeedCard from '@/components/dashboard/TechFeedCard';

export default function TechFeedPage() {
    const { user, isLeader, isAdmin } = useAuth();
    const { currentClub, loading: clubLoading } = useClub();
    const [feedItems, setFeedItems] = useState<TechFeedItem[]>([]);
    const [recommendedItems, setRecommendedItems] = useState<TechFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [recLoading, setRecLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<TechFeedCategory | 'all'>('all');
    const autoSyncClubIdRef = useRef<string | null>(null);
    const lastRefreshRef = useRef<number>(0);

    useEffect(() => {
        if (clubLoading) return;

        if (!currentClub) {
            setFeedItems([]);
            setLoading(false);
            return;
        }

        // Load cached news immediately for instant display
        loadCachedNews();

        // Set up real-time subscription for updates
        const unsubscribe = subscribeToTechFeed(
            (items) => {
                const uniqueTitles = new Set();
                const uniqueUrls = new Set();
                const unique = [];
                for (const item of items) {
                    if (!uniqueTitles.has(item.title) && !uniqueUrls.has(item.sourceUrl)) {
                        uniqueTitles.add(item.title);
                        uniqueUrls.add(item.sourceUrl);
                        unique.push(item);
                    }
                }
                setFeedItems(unique);
                setLoading(false);
            },
            undefined, // Global feed, no clubId filter
            categoryFilter === 'all' ? undefined : categoryFilter,
            (error) => {
                console.error('Tech feed subscription failed', error);
                setFeedItems([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentClub, clubLoading, categoryFilter]);

    useEffect(() => {
        if (!user) return;

        const fetchRecommendations = async () => {
            setRecLoading(true);
            try {
                const res = await fetch(`/api/tech-feed/recommendations?uid=${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setRecommendedItems(data.items);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setRecLoading(false);
            }
        };

        fetchRecommendations();
    }, [user]);

    const loadCachedNews = async () => {
        try {
            const cachedItems = await getTechFeed(undefined, undefined, 50);
            if (cachedItems.length > 0) {
                setFeedItems(cachedItems);
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load cached news:', error);
        }
    };

    useEffect(() => {
        if (clubLoading) return;
        if (!currentClub) return;
        if (!isAdmin && !isLeader) return;
        if (autoSyncClubIdRef.current === currentClub.id) return;

        autoSyncClubIdRef.current = currentClub.id;

        const triggerAutoRefresh = async () => {
            const now = Date.now();
            const hoursSinceLastRefresh = (now - lastRefreshRef.current) / (1000 * 60 * 60);

            // Auto-refresh if it's been more than 24 hours or never refreshed
            if (hoursSinceLastRefresh >= 24 || lastRefreshRef.current === 0) {
                console.log('Auto-refreshing news feed (24h cycle)');
                setSyncing(true);
                try {
                    const res = await fetch('/api/tech-feed/sync', { method: 'POST' });
                    if (!res.ok) return;
                    const data = await res.json();
                    if (data.success) {
                        lastRefreshRef.current = now;
                    }
                } catch (e) {
                    console.error('Auto-sync failed', e);
                } finally {
                    setSyncing(false);
                }
            }
        };

        triggerAutoRefresh();
    }, [currentClub, clubLoading, isAdmin, isLeader]);

    const handleManualSync = async () => {
        if (!isAdmin && !isLeader) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/tech-feed/sync', { method: 'POST' });
            if (!res.ok) throw new Error('Sync failed');
            const data = await res.json();
            if (data.success) {
                lastRefreshRef.current = Date.now();
                if (data.newItems === 0) {
                    alert('Intelligence stream is already up to date.');
                } else {
                    alert(`Successfully ingested ${data.newItems} new intelligence signals.`);
                }
            }
        } catch (e) {
            console.error('Sync failed', e);
            alert('Synchronization protocol failed.');
        } finally {
            setSyncing(false);
        }
    };

    if (!clubLoading && !currentClub) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 animate-elevator-in">
                <div className="relative">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-blue-700/10 flex items-center justify-center border border-indigo-500/20">
                        <svg className="w-16 h-16 text-indigo-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-black shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </div>
                </div>
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight leading-none">Signal Interrupted</h2>
                    <p className="text-gray-400 font-medium">Global intelligence streams are restricted to verified club members. Synchronize with a research node to reconnect.</p>
                </div>
                <Link href="/clubs" className="btn-primary py-4 px-10 text-xs font-bold uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-shadow">
                    Establish Connection
                </Link>
            </div>
        );
    }

    const categories: TechFeedCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Industry', 'Tools'];

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            {syncing ? 'Synchronizing Stream...' : 'Intelligence Feed Active'}
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase leading-none">
                        Club Intelligence
                    </h1>
                    <p className="text-gray-400 text-sm font-medium">
                        Technical signals and research updates for this cluster.
                    </p>
                </div>

                <div className="flex flex-col md:items-end gap-3">
                    <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${categoryFilter === 'all' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${categoryFilter === cat ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    {(isLeader || isAdmin) && (
                        <button
                            onClick={handleManualSync}
                            disabled={syncing}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-400 hover:text-accent-300 transition-colors disabled:opacity-50 border border-accent-500/30 hover:border-accent-500/50 hover:bg-accent-500/10 rounded-xl px-4 py-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        >
                            <svg className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync
                        </button>
                    )}
                </div>
            </div>

            {/* Recommended Section (Only if expertise exists) */}
            {!loading && recommendedItems.length > 0 && categoryFilter === 'all' && (
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <h2 className="text-xl font-extrabold text-white uppercase tracking-tight">Recommended for Your Research</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {recommendedItems.map((item) => (
                            <div key={`rec-${item.id}`} className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-500 to-amber-500 rounded-[1.5rem] blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                                <TechFeedCard item={item} />
                            </div>
                        ))}
                    </div>
                    <div className="border-b border-dashed border-white/10 pt-4"></div>
                </div>
            )}

            {/* Main Feed */}
            <div className="space-y-5">
                {loading ? (
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-12 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Intelligence...</p>
                    </div>
                ) : feedItems.length === 0 ? (
                    <div className="bg-black/40 backdrop-blur-xl border border-dashed border-white/20 p-16 rounded-[2.5rem] flex flex-col items-center text-center space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 border border-white/10">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">Awaiting Signals</h3>
                            <p className="text-gray-400 text-sm max-w-sm mx-auto">No intelligence updates currently matching your filters.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-elevator-in">
                        {feedItems.map((item) => (
                            <TechFeedCard key={item.id} item={item} />
                        ))}
                    </div>
                )}

                {!loading && feedItems.length > 0 && (
                    <div className="pt-12 flex flex-col items-center justify-center gap-3 opacity-50">
                        <div className="h-1 w-24 bg-white/10 rounded-full"></div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">End of Feed</p>
                    </div>
                )}
            </div>
        </div>
    );
}
