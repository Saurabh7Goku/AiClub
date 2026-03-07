'use client';

import { TechFeedItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface TechFeedCardProps {
  item: TechFeedItem;
}

export default function TechFeedCard({ item }: TechFeedCardProps) {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryModel, setSummaryModel] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categoryConfig = {
    LLM: { text: 'text-blue-500', pill: 'bg-blue-500/10 text-blue-500 border border-blue-500/20' },
    Vision: { text: 'text-accent-500', pill: 'bg-accent-500/10 text-accent-500 border border-accent-500/20' },
    Infra: { text: 'text-amber-500', pill: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' },
    Agents: { text: 'text-purple-500', pill: 'bg-purple-500/10 text-purple-500 border border-purple-500/20' },
    Research: { text: 'text-indigo-500', pill: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' },
  };

  const categoryStyle = categoryConfig[item.category as keyof typeof categoryConfig];
  const hrefHost = (() => {
    try {
      return new URL(item.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (summary) {
      setIsModalOpen(true);
      return;
    }

    setLoadingSummary(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          content: item.summary,
          url: item.sourceUrl,
        }),
      });
      const data = await res.json();
      if (data.success && data.bullets?.length > 0) {
        setSummary(data.bullets);
        setSummaryModel(data.model || '');
        setIsModalOpen(true);
      } else {
        setSummary([`AI Error: ${data.error || 'Unknown error'}`]);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      setSummary([`Connection Error: ${err.message || 'Failed to reach backend'}`]);
      setIsModalOpen(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <>
      <div className="block group">
        <div className="relative z-10 bg-card rounded-2xl p-5 border border-white/10 hover:border-accent-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.2em] ${categoryStyle?.pill || 'bg-white/5 text-gray-400 border border-white/10'}`}
                >
                  {item.category}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-500 opacity-80">
                  {item.sourceName}
                </span>
              </div>

              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                <h3 className="text-lg font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tight leading-snug group-hover:text-accent-400 transition-colors line-clamp-2">
                  {item.title}
                </h3>
              </a>

              <p className="text-sm font-medium text-gray-400 line-clamp-2 leading-relaxed">
                {item.summary}
              </p>

              <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDistanceToNow(item.publishedAt, { addSuffix: true })}
                {hrefHost && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="opacity-80 tracking-tight lowercase font-medium">{hrefHost}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:border-accent-500/30 hover:bg-accent-500/10 transition-colors">
                  <svg className="w-4 h-4 text-gray-400 hover:text-accent-400 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
              <button
                onClick={handleSummarize}
                disabled={loadingSummary}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                  summary
                    ? 'bg-accent-500/10 border-accent-500/30 text-accent-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-accent-400'
                } disabled:opacity-50`}
                title={summary ? 'Show AI Summary' : 'Summarize with AI'}
              >
                {loadingSummary ? (
                  <div className="w-3.5 h-3.5 border border-white/20 border-t-accent-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {isModalOpen && summary && (
        <div 
          className="w-full fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-black/80 border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-elevator-in overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Background Accents */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px]"></div>

            <div className="relative space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">Intelligence Synthesis</h4>
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight uppercase line-clamp-2">
                    {item.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

              <ul className="space-y-4">
                {summary.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
                    <span className="w-6 h-6 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-[10px] font-bold text-accent-400 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    Source: {item.sourceName}
                  </span>
                </div>
                {summaryModel && (
                  <span className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">
                    Processed via {summaryModel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
