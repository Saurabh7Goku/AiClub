'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { createClub, joinClub, getAllClubs } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import { Club } from '@/types';

export default function ClubsPage() {
    const { user, isAdmin } = useAuth();
    const { clubs: joinedClubs, refreshClubs, selectClub } = useClub();
    const router = useRouter();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Join state
    const [joiningClubId, setJoiningClubId] = useState<string | null>(null);
    const [joinKey, setJoinKey] = useState('');

    // Create state
    const [clubName, setClubName] = useState('');
    const [clubDesc, setClubDesc] = useState('');
    const [clubKey, setClubKey] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const fetched = await getAllClubs();
            setAllClubs(fetched);
        } catch (err) {
            console.error('Failed to load clusters:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAdmin) return;
        setActionLoading('create');
        setError(null);
        try {
            const newClub = await createClub(user.uid, clubName, clubDesc, clubKey);
            await Promise.all([refreshClubs(), loadData()]);
            selectClub(newClub.id);
            setSuccess(`Cluster "${clubName}" initialized.`);
            setIsCreating(false);
            setClubName('');
            setClubDesc('');
            setClubKey('');
        } catch (err: any) {
            setError(err.message || 'Failed to initialize cluster.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleJoinClub = async (clubId: string) => {
        if (!user) return;
        setActionLoading(clubId);
        setError(null);
        try {
            const club = await joinClub(user.uid, joinKey);
            await Promise.all([refreshClubs(), loadData()]);
            selectClub(club.id);
            setSuccess(`Synchronized with "${club.name}".`);
            setJoiningClubId(null);
            setJoinKey('');
        } catch (err: any) {
            setError(err.message || 'Synchronization failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const isMember = (clubId: string) => joinedClubs.some(c => c.id === clubId);

    return (
        <div className="w-full space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-white/10">
                <div className="space-y-1.5">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase mt-1">Intelligence Clusters</h1>
                    <p className="text-gray-400 text-[15px] font-medium max-w-lg">Direct directory of available research nodes and active clusters.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="btn-primary py-3.5 px-8 text-[11px] font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-shadow"
                    >
                        {isCreating ? 'Dismiss Protocol' : 'Initialize New Cluster'}
                    </button>
                )}
            </div>

            {/* Notifications */}
            <div className="space-y-4">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-shake backdrop-blur-md">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest leading-none">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl flex items-center gap-3 animate-elevator-in backdrop-blur-md">
                        <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs font-bold text-accent-400 uppercase tracking-widest leading-none">{success}</p>
                    </div>
                )}
            </div>

            {/* Creation Form */}
            {isCreating && (
                <div className="bg-black/40 backdrop-blur-xl max-w-4xl mx-auto p-8 border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)] animate-elevator-in mb-8">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Cluster Initialization Protocol</h2>
                    <form onSubmit={handleCreateClub} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cluster Identity</label>
                                <input
                                    required
                                    type="text"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    placeholder="e.g. Neural Dynamics Group"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Authorization Key</label>
                                <input
                                    required
                                    type="text"
                                    value={clubKey}
                                    onChange={(e) => setClubKey(e.target.value)}
                                    placeholder="Unique alphanumeric key"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cluster Objectives</label>
                            <textarea
                                required
                                value={clubDesc}
                                onChange={(e) => setClubDesc(e.target.value)}
                                placeholder="Define the primary research focus and goals..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 outline-none transition-all min-h-[100px] leading-relaxed placeholder:text-gray-600"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={actionLoading === 'create'}
                                type="submit"
                                className="btn-primary"
                            >
                                {actionLoading === 'create' ? 'Initializing...' : 'Confirm Initialization'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Clusters Grid */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Retrieving Cluster Directory...</p>
                </div>
            ) : allClubs.length === 0 ? (
                <div className="py-20 text-center space-y-6 bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-dashed border-white/20 max-w-3xl mx-auto">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-gray-400 border border-white/10">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Clusters Found</p>
                        <p className="text-gray-500 text-lg font-normal max-w-sm mx-auto">Intelligence clusters are currently offline. Synchronize later or initialize a new node.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-elevator-in">
                    {allClubs.map((club) => {
                        const joined = isMember(club.id);
                        const isJoining = joiningClubId === club.id;

                        return (
                            <div key={club.id} className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 flex flex-col justify-between group h-full transition-all duration-300 hover:bg-white/[0.02] ${joined ? 'border-accent-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]' : 'border-white/10 hover:border-accent-500/30'}`}>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${joined ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-white/5 text-gray-400  border-white/10 group-hover:bg-accent-500/5 group-hover:text-accent-400 group-hover:border-accent-500/20'}`}>
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.15em] bg-white/5 py-1.5 px-3 rounded-lg border border-white/10">
                                                {club.memberCount} Nodes Active
                                            </span>
                                            {joined && (
                                                <span className="mt-2 text-[10px] font-bold text-accent-400 uppercase tracking-widest flex items-center gap-1.5 bg-accent-500/10 px-2.5 py-1 rounded border border-accent-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span> Joined
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight group-hover:text-accent-400 transition-colors">
                                            {club.name}
                                        </h3>
                                        <p className="text-[15px] text-gray-400 font-medium line-clamp-3 leading-relaxed">
                                            {club.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t border-white/10">
                                    {joined ? (
                                        <button
                                            onClick={() => { selectClub(club.id); router.push('/'); }}
                                            className="w-full btn-primary font-bold py-3.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                                        >
                                            Enter Cluster Node
                                        </button>
                                    ) : isJoining ? (
                                        <div className="space-y-3 animate-elevator-in">
                                            <div className="relative">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={joinKey}
                                                    onChange={(e) => setJoinKey(e.target.value)}
                                                    placeholder="Verification Key Required"
                                                    className="w-full bg-white/5 border border-white/20 rounded-xl p-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white placeholder-gray-500 outline-none pr-10 focus:border-accent-500 focus:bg-white/10 transition-colors shadow-inner"
                                                />
                                                <button
                                                    onClick={() => { setJoiningClubId(null); setJoinKey(''); }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white z-10 p-1 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <button
                                                disabled={actionLoading === club.id}
                                                onClick={() => handleJoinClub(club.id)}
                                                className="w-full btn-primary py-3.5 shadow-lg shadow-accent-500/20"
                                            >
                                                {actionLoading === club.id ? 'Synchronizing...' : 'Request Connection'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setJoiningClubId(club.id)}
                                            className="w-full border border-white/20 text-white font-bold py-3.5 rounded-full hover:bg-white/10 hover:border-white/30 transition-all text-[11px] uppercase tracking-widest"
                                        >
                                            Join Intelligence Cluster
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
