'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToIdeas } from '@/lib/firebase/firestore';
import { Idea } from '@/types';
import Link from 'next/link';

// Simple fuzzy search implementation (no external dependency needed)
function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match
  if (t.includes(q)) return { matches: true, score: 1.0 };

  // Character-by-character fuzzy matching
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      score += 1;
      // Bonus for consecutive matches
      if (ti > 0 && t[ti - 1] === q[qi - 2]) score += 0.5;
    }
  }

  if (qi === q.length) {
    return { matches: true, score: score / q.length };
  }
  return { matches: false, score: 0 };
}

function searchIdeas(ideas: Idea[], query: string): Idea[] {
  if (!query.trim()) return [];

  const results = ideas
    .map((idea) => {
      const titleMatch = fuzzyMatch(query, idea.title);
      const descMatch = fuzzyMatch(query, idea.problemStatement);
      const categoryMatch = fuzzyMatch(query, idea.category);
      const tagMatches = idea.tags.map(t => fuzzyMatch(query, t));
      const bestTagScore = Math.max(0, ...tagMatches.map(m => m.score));
      const submitterMatch = fuzzyMatch(query, idea.submittedBy.displayName);

      const maxScore = Math.max(
        titleMatch.score * 1.5, // Title has highest weight
        descMatch.score,
        categoryMatch.score * 1.2,
        bestTagScore * 1.3,
        submitterMatch.score * 0.8
      );

      const anyMatch = titleMatch.matches || descMatch.matches || categoryMatch.matches ||
        tagMatches.some(m => m.matches) || submitterMatch.matches;

      return { idea, score: maxScore, matches: anyMatch };
    })
    .filter(r => r.matches)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return results.map(r => r.idea);
}

export default function GlobalSearch() {
  const { user } = useAuth();
  const { currentClub } = useClub();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allIdeas, setAllIdeas] = useState<Idea[]>([]);
  const [results, setResults] = useState<Idea[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to all ideas for search index
  useEffect(() => {
    if (!currentClub) return;
    const unsubscribe = subscribeToIdeas(currentClub.id, (ideas) => {
      setAllIdeas(ideas);
    });
    return () => unsubscribe();
  }, [currentClub]);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search as user types
  useEffect(() => {
    setResults(searchIdeas(allIdeas, query));
  }, [query, allIdeas]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const statusColors: Record<string, string> = {
    open: 'text-accent-400',
    under_review: 'text-amber-400',
    approved: 'text-blue-400',
    rejected: 'text-gray-400',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-gray-400 group"
      >
        <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-[9px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-500">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Search Panel */}
          <div
            ref={containerRef}
            className="relative w-full max-w-lg mx-4 bg-card border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-elevator-in"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ideas, categories, tags..."
                className="flex-1 bg-transparent text-sm font-medium text-[rgb(var(--foreground-rgb))] placeholder-gray-500 outline-none"
              />
              <kbd
                onClick={() => { setIsOpen(false); setQuery(''); }}
                className="cursor-pointer text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-500 hover:bg-white/10 transition-colors"
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === '' ? (
                <div className="px-5 py-8 text-center text-gray-500 text-xs font-medium">
                  Start typing to search across all ideas...
                </div>
              ) : results.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500 text-xs font-medium">
                  No results for &quot;<span className="text-[rgb(var(--foreground-rgb))]">{query}</span>&quot;
                </div>
              ) : (
                <div className="divide-y divide-white/5 py-1">
                  {results.map((idea) => (
                    <Link
                      key={idea.id}
                      href={`/ideas/${idea.id}`}
                      onClick={() => { setIsOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[rgb(var(--foreground-rgb))] group-hover:text-accent-400 transition-colors truncate">
                          {idea.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold uppercase ${statusColors[idea.status] || 'text-gray-400'}`}>
                            {idea.status.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-gray-500 font-medium">
                            {idea.category}
                          </span>
                          {idea.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[9px] text-gray-500 font-medium">
                Fuzzy search powered by built-in engine
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
