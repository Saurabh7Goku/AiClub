'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import Link from 'next/link';

interface MatchedIdea {
  ideaId: string;
  reason: string;
  matchScore: number;
  idea: {
    id: string;
    title: string;
    category: string;
    voteScore: number;
    tags: string[];
  };
}

export default function MatchmakingRecommendations() {
  const { user } = useAuth();
  const { currentClub } = useClub();
  const [matches, setMatches] = useState<MatchedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadMatches = async () => {
    if (!user || !currentClub) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/ai/matchmaking?uid=${user.uid}&clubId=${currentClub.id}`);
      const data = await res.json();

      if (data.success) {
        setMatches(data.matches || []);
      } else {
        setError(data.message || data.error || 'Failed to load recommendations');
      }
    } catch (err) {
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const categoryColors: Record<string, string> = {
    LLM: 'text-blue-400',
    Vision: 'text-accent-400',
    Infra: 'text-amber-400',
    Agents: 'text-purple-400',
    Research: 'text-indigo-400',
    Other: 'text-gray-400',
  };

  return (
    <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
            Ideas For You
          </h3>
        </div>
        <button
          onClick={loadMatches}
          disabled={loading}
          className="text-[9px] font-bold uppercase tracking-widest text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-3 h-3 border border-white/20 border-t-accent-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {hasLoaded ? 'Refresh' : 'Find Matches'}
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-white/5">
        {!hasLoaded && !loading ? (
          <div className="px-5 py-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <p className="text-gray-400 text-xs font-medium max-w-[200px] mx-auto">
              Click &quot;Find Matches&quot; to get AI-powered idea recommendations based on your profile
            </p>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              Analyzing your profile...
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-6 text-center">
            <p className="text-gray-400 text-xs font-medium">{error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            No new matches — you&apos;ve explored all active ideas!
          </div>
        ) : (
          matches.map((match) => (
            <Link
              key={match.ideaId}
              href={`/ideas/${match.ideaId}`}
              className="block px-5 py-4 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Match Score */}
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-extrabold text-accent-400">
                    {Math.round((match.matchScore || 0) * 100)}%
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${categoryColors[match.idea.category] || 'text-gray-400'}`}>
                      {match.idea.category}
                    </span>
                    <span className="text-[9px] font-medium text-gray-500">
                      Score: {match.idea.voteScore > 0 ? '+' : ''}{match.idea.voteScore}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[rgb(var(--foreground-rgb))] group-hover:text-accent-400 transition-colors line-clamp-1">
                    {match.idea.title}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium line-clamp-2">
                    {match.reason}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
