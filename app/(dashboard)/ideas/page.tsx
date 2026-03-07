'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToIdeas, createOrUpdateVote, getVote } from '@/lib/firebase/firestore';
import { Idea, VoteType, IdeaStatus, IdeaCategory } from '@/types';
import IdeaCard from '@/components/dashboard/IdeaCard';

export default function AllIdeasPage() {
  const { user } = useAuth();
  const { currentClub, loading: clubLoading } = useClub();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IdeaCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (clubLoading) return;
    if (!currentClub) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    setLoading(true);

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
      const previousVote = userVotes[ideaId] || null;
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

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.problemStatement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!clubLoading && !currentClub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-elevator-in">
        <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-dashed border-white/10">
          <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">Synchronization Required</h2>
          <p className="text-gray-400 font-medium max-w-xs mx-auto">Access to the research inventory requires an active connection to an intelligence node.</p>
        </div>
        <Link href="/clubs" className="btn-primary py-3 px-10 text-[11px] font-bold uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-shadow">
          Connect to a Node
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80">Node: {currentClub?.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase leading-none">Club Repository</h1>
          <p className="text-gray-400 text-sm font-medium">Internal research proposals and technical hypotheses.</p>
        </div>
        <Link
          href="/ideas/new"
          className="btn-primary px-6 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          New Proposal
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search proposals, hypotheses, or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[15px] font-medium placeholder-gray-500 text-white focus:outline-none focus:border-accent-500 focus:bg-white/10 transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IdeaStatus | 'all')}
            className="bg-white/5 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] text-gray-300 border border-white/10 outline-none cursor-pointer focus:border-accent-500 focus:bg-white/10 transition-all shadow-inner [&>option]:bg-gray-900"
          >
            <option value="all">Status</option>
            <option value="open">Open</option>
            <option value="under_review">Audit</option>
            <option value="approved">Validated</option>
            <option value="rejected">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as IdeaCategory | 'all')}
            className="bg-white/5 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] text-gray-300 border border-white/10 outline-none cursor-pointer focus:border-accent-500 focus:bg-white/10 transition-all shadow-inner [&>option]:bg-gray-900"
          >
            <option value="all">Type</option>
            {['LLM', 'Vision', 'Infra', 'Agents', 'Research'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Directory...</p>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl border border-dashed border-white/20 p-16 rounded-[2.5rem] flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">No Results Found</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">No proposals match your current filter parameters. Initialize a new idea or broaden your search.</p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
              className="text-accent-400 font-bold text-xs uppercase tracking-widest hover:text-accent-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-elevator-in">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                userVote={userVotes[idea.id] || null}
                onVote={handleVote}
                votingDisabled={votingInProgress !== null}
              />
            ))}

            <div className="pt-12 flex flex-col items-center justify-center gap-3 opacity-50">
              <div className="h-1 w-24 bg-white/10 rounded-full"></div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                End of Directory • {filteredIdeas.length} Nodes Loaded
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


