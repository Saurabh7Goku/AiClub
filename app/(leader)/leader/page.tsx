'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  getHighPerformingIdeas,
  getControversialIdeas,
  getStalledIdeas,
  getIdeasByStatus,
  updateIdeaStatus,
} from '@/lib/firebase/firestore';
import { Idea, IdeaStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'high-performing' | 'controversial' | 'stalled' | 'under_review';

export default function LeaderPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('high-performing');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    let data: Idea[] = [];
    switch (activeTab) {
      case 'high-performing': data = await getHighPerformingIdeas(15); break;
      case 'controversial': data = await getControversialIdeas(5); break;
      case 'stalled': data = await getStalledIdeas(7); break;
      case 'under_review':
        data = await getIdeasByStatus('under_review', 50);
        break;
    }
    setIdeas(data);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);


  const handleStatusUpdate = async (ideaId: string, status: IdeaStatus) => {
    if (!user) return;
    setProcessingId(ideaId);
    try {
      await updateIdeaStatus(ideaId, status, user.uid);
      await loadIdeas();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateDraft = async (ideaId: string) => {
    setProcessingId(ideaId);
    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });
      const result = await response.json();
      if (result.success) alert('AI Draft generated successfully!');
      else alert(`Draft generation pending: ${result.error || 'Check configuration'}`);
    } catch (error) {
      console.error('Error generating draft:', error);
      alert('Failed to generate draft');
    } finally {
      setProcessingId(null);
    }
  };

  const statusConfig = {
    open: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    under_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    approved: 'bg-primary-500/10 text-primary-600 border-primary-500/20',
    rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  };

  const tabs: { key: TabType; label: string; description: string }[] = [
    { key: 'high-performing', label: 'Popular', description: 'Ideas with high community support' },
    { key: 'under_review', label: 'Needs Review', description: 'Ideas waiting for leader approval' },
    { key: 'controversial', label: 'Controversial', description: 'Ideas with mixed reviews' },
    { key: 'stalled', label: 'Inactive', description: 'Ideas with no recent activity' },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1 relative">
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary-500/10 blur-[50px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-500">Leader Admin</p>
          </div>
          <h1 className="text-4xl font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tight uppercase leading-none relative z-10">
            Leader <span className="text-primary-500 drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">Dashboard</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm relative z-10 mt-2">Review and manage project ideas from club members.</p>
        </div>
      </div>

      {/* Navigation Framework */}
      <div className="space-y-6">
        <div className="flex p-1 bg-card rounded-2xl border border-white/10 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-primary-500/20 text-primary-400 shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.1)]' : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))] hover:bg-white/5'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400">
            {tabs.find((t) => t.key === activeTab)?.description}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <div className="relative">
               <div className="w-16 h-16 border-4 border-white/10 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary-500 animate-pulse">Scanning Submissions...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="bg-card backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-24 flex flex-col items-center text-center space-y-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary-500/5 blur-[50px] rounded-full pointer-events-none" />
            <div className="w-20 h-20 rounded-3xl bg-card border border-white/10 flex items-center justify-center relative z-10 shadow-inner">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none relative z-10">No Records Found</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-card backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-8 group hover:border-primary-500/30 transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-primary-500/10 transition-colors" />

                  <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${statusConfig[idea.status as keyof typeof statusConfig]}`}>
                        {idea.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 opacity-80 uppercase tracking-widest leading-none bg-card border border-white/10 px-2 py-0.5 rounded-lg">{idea.category}</span>
                    </div>

                    <Link href={`/ideas/${idea.id}`}>
                      <h3 className="text-xl font-extrabold group-hover:text-primary-500 transition-colors tracking-tight leading-none mb-2">
                        {idea.title}
                      </h3>
                    </Link>

                    <p className="dark:text-gray-400 text-gray-600 font-medium text-sm line-clamp-2 leading-relaxed">
                      {idea.problemStatement}
                    </p>

                    <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-[8px] font-bold">
                           {idea.submittedBy.displayName[0]}
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                          {idea.submittedBy.displayName}
                        </span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-white/20 "></span>
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                        {formatDistanceToNow(idea.createdAt, { addSuffix: true })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/20 "></span>
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${idea.voteScore >= 0 ? 'text-primary-500 bg-primary-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        {idea.voteScore} Score ({idea.votesIn} / {idea.votesOut})
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col gap-3 min-w-[200px] relative z-10 p-4 bg-card rounded-2xl border border-white/10">
                    {idea.status === 'open' && (
                      <button
                        onClick={() => handleStatusUpdate(idea.id, 'under_review')}
                        disabled={processingId === idea.id}
                        className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        Start Review
                      </button>
                    )}

                    {idea.status === 'under_review' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(idea.id, 'approved')}
                          disabled={processingId === idea.id}
                          className="w-full bg-primary-500 text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          Approve Idea
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(idea.id, 'rejected')}
                          disabled={processingId === idea.id}
                          className="w-full border border-white/10 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/30 transition-all disabled:opacity-50"
                        >
                          Reject Idea
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleGenerateDraft(idea.id)}
                      disabled={processingId === idea.id}
                      className="w-full bg-primary-500/10 text-primary-400 border border-primary-500/20 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processingId === idea.id ? <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div> : 'Generate AI Draft'}
                    </button>

                    {idea.aiDraftId && (
                      <Link
                        href={`/leader/drafts/${idea.aiDraftId}`}
                        className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 text-center py-2"
                      >
                        Access Draft →
                      </Link>
                    )}
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
        {[
          { label: 'Approved Ideas', value: ideas.filter((i) => i.status === 'approved').length, color: 'bg-primary-500/5 text-primary-500 border-primary-500/20' },
          { label: 'Currently in Review', value: ideas.filter((i) => i.status === 'under_review').length, color: 'bg-amber-500/5 text-amber-500 border-amber-500/20' },
          { label: 'Rejected Ideas', value: ideas.filter((i) => i.status === 'rejected').length, color: 'bg-rose-500/5 text-rose-500 border-rose-500/20' }
        ].map((stat, i) => (
          <div key={i} className={`bg-card backdrop-blur-xl p-8 rounded-[2.5rem] border ${stat.color} group hover:scale-[1.02] transition-all duration-300 shadow-lg`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-60">{stat.label}</p>
            <p className="text-5xl font-extrabold tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
