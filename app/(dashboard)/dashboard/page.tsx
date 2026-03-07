'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToIdeas, createOrUpdateVote, getVote, subscribeToTechFeed } from '@/lib/firebase/firestore';
import { Idea, VoteType, IdeaStatus, IdeaCategory, TechFeedItem } from '@/types';
import IdeaCard from '@/components/dashboard/IdeaCard';
import TechFeedCard from '@/components/dashboard/TechFeedCard';
import Leaderboard from '@/components/dashboard/Leaderboard';
import BountyBoard from '@/components/dashboard/BountyBoard';
import UserBadges from '@/components/profile/UserBadges';
import MatchmakingRecommendations from '@/components/dashboard/MatchmakingRecommendations';

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentClub, loading: clubLoading } = useClub();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [techFeed, setTechFeed] = useState<TechFeedItem[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'ideas'>('feed');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IdeaCategory | 'all'>('all');

  useEffect(() => {
    if (clubLoading) return;
    if (!currentClub) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    // Silent background sync
    fetch('/api/tech-feed/sync', { method: 'POST' }).catch(() => { });

    const unsubscribe = subscribeToIdeas(
      currentClub.id,
      (ideasData) => {
        setIdeas(ideasData);
        setLoading(false);
      },
      statusFilter === 'all' ? undefined : statusFilter,
      categoryFilter === 'all' ? undefined : categoryFilter,
      (error) => {
        console.error('Ideas subscription failed', error);
        setIdeas([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentClub, clubLoading, statusFilter, categoryFilter]);

  useEffect(() => {
    if (clubLoading) return;

    const unsubscribe = subscribeToTechFeed(
      (feedData) => {
        const uniqueTitles = new Set();
        const uniqueUrls = new Set();
        const unique = [];
        for (const item of feedData) {
          if (!uniqueTitles.has(item.title) && !uniqueUrls.has(item.sourceUrl)) {
            uniqueTitles.add(item.title);
            uniqueUrls.add(item.sourceUrl);
            unique.push(item);
          }
        }
        setTechFeed(unique.slice(0, 5));
      },
      undefined // Global feed, no clubId filter
    );
    return () => unsubscribe();
  }, [clubLoading]);

  useEffect(() => {
    if (!user || ideas.length === 0) return;
    const loadVotes = async () => {
      const votes: Record<string, VoteType> = {};
      for (const idea of ideas) {
        const vote = await getVote(idea.id, user.uid);
        if (vote) votes[idea.id] = vote.vote;
      }
      setUserVotes(votes);
    };
    loadVotes();
  }, [user, ideas]);

  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);

  const handleVote = async (ideaId: string, voteType: VoteType) => {
    if (!user || votingInProgress) return;
    // If user already voted the same way, skip
    if (userVotes[ideaId] === voteType) return;
    try {
      setVotingInProgress(ideaId);
      // Optimistic update
      setUserVotes((prev) => ({ ...prev, [ideaId]: voteType }));
      await createOrUpdateVote(ideaId, user.uid, voteType);
    } catch (error) {
      console.error('Error voting:', error);
      // Rollback on error
      const vote = await getVote(ideaId, user.uid);
      setUserVotes((prev) => {
        const next = { ...prev };
        if (vote) {
          next[ideaId] = vote.vote;
        } else {
          delete next[ideaId];
        }
        return next;
      });
    } finally {
      setVotingInProgress(null);
    }
  };

  if (!clubLoading && !currentClub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 animate-elevator-in relative z-10">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[2.5rem] bg-card flex items-center justify-center border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-accent-500/5 group-hover:bg-accent-500/10 transition-colors duration-500 rounded-[2.5rem]"></div>
            <svg className="w-16 h-16 text-gray-500 group-hover:text-accent-400 transition-colors duration-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-background backdrop-blur-md shadow-2xl flex items-center justify-center border border-white/10">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          </div>
        </div>
        <div className="space-y-4 max-w-sm">
          <h2 className="text-3xl font-extrabold text-[rgb(var(--foreground-rgb))] uppercase tracking-tight">No Node Connection</h2>
          <p className="text-gray-400 font-medium">Authentication successful, but no intelligence clusters detected. Synchronize with a research node to access shared data.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/clubs" className="relative py-4 px-10 rounded-xl bg-accent-500 hover:bg-accent-400 text-black font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative z-10">Access Club Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600 dark:text-accent-400">Node: {currentClub?.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tight uppercase leading-none">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Welcome back, <span className="text-black dark:text-white font-black">{user?.displayName?.split(' ')[0]}</span>. Here&apos;s your research summary.
          </p>
        </div>
        <Link
          href="/ideas/new"
          className="relative py-2.5 px-6 rounded-xl bg-accent-500 hover:bg-accent-400 text-black font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 group overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="relative z-10">New Proposal</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Research', value: ideas.length, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-indigo-400', iconColor: 'text-indigo-500', bg: 'bg-indigo-500/5', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/10' },
          { label: 'Active Proposals', value: ideas.filter(i => i.status === 'open').length, icon: 'M5 13l4 4L19 7', color: 'text-accent-400', iconColor: 'text-accent-500', bg: 'bg-accent-500/5', border: 'border-accent-500/20', iconBg: 'bg-accent-500/10' },
          { label: 'Under Review', value: ideas.filter(i => i.status === 'under_review').length, icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-amber-400', iconColor: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10' },
          { label: 'Validated', value: ideas.filter(i => i.status === 'approved').length, icon: 'M9 12l2 2 4-4', color: 'text-blue-400', iconColor: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20', iconBg: 'bg-blue-500/10' }
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-2xl ${stat.bg} border ${stat.border} flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 group`}>
            <div className={`w-12 h-12 rounded-xl ${stat.iconBg} border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"></div>
              <svg className={`w-6 h-6 relative z-10 ${stat.iconColor} group-hover:scale-110 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className={`font-semibold text-[10px] uppercase tracking-[0.15em] mb-1 ${stat.color}`}>{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-[rgb(var(--foreground-rgb))] leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Framework */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ideas Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="flex gap-2 p-1 bg-card rounded-xl border border-white/10 w-full sm:w-fit overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${activeTab === 'feed' ? 'bg-white/10 text-[rgb(var(--foreground-rgb))] shadow-sm' : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))]'
                  }`}
              >
                Feed
              </button>
              <button
                onClick={() => setActiveTab('ideas')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${activeTab === 'ideas' ? 'bg-white/10 text-[rgb(var(--foreground-rgb))] shadow-sm' : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))]'
                  }`}
              >
                Trending
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-4 bg-card p-2 rounded-xl border border-white/10 w-full sm:w-fit">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as IdeaStatus | 'all')}
                className="bg-transparent text-[10px] sm:text-[11px] font-bold text-[rgb(var(--foreground-rgb))] opacity-70 uppercase tracking-[0.15em] outline-none cursor-pointer focus:opacity-100 transition-opacity flex-1 sm:flex-none"
                style={{ WebkitAppearance: 'none' }}
              >
                <option value="all" className="bg-background">Status</option>
                <option value="open" className="bg-background">Open</option>
                <option value="under_review" className="bg-background">Audit</option>
                <option value="approved" className="bg-background">Validated</option>
              </select>
              <div className="w-[1px] h-4 bg-white/20"></div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as IdeaCategory | 'all')}
                className="bg-transparent text-[10px] sm:text-[11px] font-bold text-[rgb(var(--foreground-rgb))] opacity-70 uppercase tracking-[0.15em] outline-none cursor-pointer focus:opacity-100 transition-opacity flex-1 sm:flex-none"
                style={{ WebkitAppearance: 'none' }}
              >
                <option value="all" className="bg-background">Type</option>
                {['LLM', 'Vision', 'Infra', 'Agents', 'Research'].map(c => <option key={c} value={c} className="bg-background">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-card border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Retrieving intelligence...</p>
              </div>
            ) : ideas.length === 0 ? (
              <div className="bg-card border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-inner">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[rgb(var(--foreground-rgb))] uppercase tracking-tight">Initialize Node</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">First core proposal needed for cluster <span className="text-gray-300 font-semibold">{currentClub?.name}</span>.</p>
                </div>
                <Link href="/ideas/new" className="relative py-2.5 px-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold tracking-widest uppercase text-[10px] transition-all mt-2 group overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 text-[rgb(var(--foreground-rgb))]">Start Entry</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 animate-elevator-in">
                {ideas
                  .slice()
                  .sort((a, b) => activeTab === 'ideas' ? b.trendingVelocity - a.trendingVelocity : 0)
                  .map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      userVote={userVotes[idea.id] || null}
                      onVote={handleVote}
                      votingDisabled={votingInProgress !== null}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence feed sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 pb-3 border-b border-white/10">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">Technical Signal</h2>
              <Link href="/tech-feed" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-accent-400 transition-colors flex items-center gap-1 group">
                Full Stream
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <div className="space-y-3">
              {techFeed.length === 0 ? (
                <div className="bg-card border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">Awaiting Data...</div>
              ) : (
                techFeed.map((item) => (
                  <TechFeedCard key={item.id} item={item} />
                ))
              )}
            </div>
          </div>

          {/* AI Matchmaking */}
          <MatchmakingRecommendations />

          {/* Bounties */}
          <BountyBoard />

          {/* Leaderboard */}
          <Leaderboard />

          {/* My Badges */}
          {user && (
            <UserBadges
              reputationScore={user.reputationScore || 0}
              displayName={user.displayName}
            />
          )}

          {/* Threshold Analytics Card */}
          <div className="bg-card p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
            {/* Inner subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-accent-500/20 to-transparent"></div>

            <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg className="w-32 h-32 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <div className="relative z-10 space-y-5">
              <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-accent-400">Validation Protocol</h3>
              <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-[90%]">
                Proposals achieving <span className="font-bold text-[rgb(var(--foreground-rgb))]">{(process.env.NEXT_PUBLIC_VOTE_THRESHOLD as unknown as number) || 20} verified votes</span> enter the formal audit phase.
              </p>
              <div className="pt-1">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="w-1/3 h-full bg-accent-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
