'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { createIdea, notifyClubMembers } from '@/lib/firebase/firestore';
import { IdeaCategory } from '@/types';
import Link from 'next/link';

export default function NewIdeaPage() {
  const { user } = useAuth();
  const { currentClub } = useClub();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    problemStatement: '',
    proposedAiUsage: '',
    category: 'Other' as IdeaCategory,
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('System authentication required for submission');
      return;
    }

    if (!currentClub) {
      setError('Active cluster synchronization required for submission');
      return;
    }

    if (!formData.title.trim() || !formData.problemStatement.trim() || !formData.proposedAiUsage.trim()) {
      setError('Core submission parameters missing');
      return;
    }

    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await createIdea(user.uid, user.displayName, {
        title: formData.title.trim(),
        problemStatement: formData.problemStatement.trim(),
        proposedAiUsage: formData.proposedAiUsage.trim(),
        category: formData.category,
        tags,
        clubId: currentClub.id
      });
      // Notify all club members
      notifyClubMembers(
        currentClub.id, user.uid, user.displayName || 'A member',
        'new_idea', `New Idea: ${formData.title.trim()}`,
        `${user.displayName || 'Someone'} submitted a new idea: "${formData.title.trim()}"`,
        { actionUrl: '/ideas' }
      );

      router.push('/');
    } catch (err) {
      console.error('Error creating idea:', err);
      setError('Initialization protocol failed. Secure terminal and retry.');
      setLoading(false);
    }
  };

  const categories: IdeaCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Other'];

  if (!currentClub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-elevator-in">
        <div className="w-24 h-24 rounded-[2rem] bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4v2m0 4v2M4 21h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">Active Node Required</h2>
          <p className="text-gray-400 font-medium">You must synchronize with an intelligence cluster before initializing a new research node.</p>
        </div>
        <Link href="/clubs" className="btn-primary py-3 px-10 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-shadow">Connect to a Cluster</Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-20">
      {/* Header Section */}
      <div className="space-y-3 pb-6 border-b border-white/10">
        <Link href="/ideas" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-accent-400 transition-colors mb-2 inline-flex items-center gap-2">
          <span>&larr;</span> Back to Repository
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80">Active Node: {currentClub.name}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Initiate Proposal</h1>
        <p className="text-gray-400 text-sm font-medium">
          Submit a new research hypothesis for community audit and validation.
        </p>
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-inner">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4v2m0 4v2M4 21h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-2">
              <label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                Proposal Title <span className="text-accent-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all shadow-inner"
                placeholder="Clear, concise title for this research"
                maxLength={100}
              />
              <div className="flex justify-end">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{formData.title.length}/100</span>
              </div>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Taxonomy <span className="text-accent-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as IdeaCategory })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-300 outline-none cursor-pointer focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 transition-all shadow-inner [&>option]:bg-gray-900"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="problemStatement" className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Hypothesis / Problem Statement <span className="text-accent-500">*</span>
              </label>
              <textarea
                id="problemStatement"
                required
                value={formData.problemStatement}
                onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all min-h-[140px] leading-relaxed shadow-inner"
                placeholder="Define the critical friction point or baseline hypothesis..."
                maxLength={1000}
              />
              <div className="flex justify-end">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{formData.problemStatement.length}/1000</span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="proposedAiUsage" className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Technical Methodology <span className="text-accent-500">*</span>
              </label>
              <textarea
                id="proposedAiUsage"
                required
                value={formData.proposedAiUsage}
                onChange={(e) => setFormData({ ...formData, proposedAiUsage: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all min-h-[140px] leading-relaxed shadow-inner"
                placeholder="Architectural approach: pipelines, models, or logic loops..."
                maxLength={1000}
              />
              <div className="flex justify-end">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{formData.proposedAiUsage.length}/1000</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="tags" className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Indexing Tags <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all shadow-inner"
              placeholder="e.g. transformers, agents, diffusion (comma separated)"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-white/10 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 btn-primary py-3.5 rounded-xl font-bold uppercase tracking-[0.15em] text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Initializing...
                </>
              ) : (
                'Submit Proposal'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

