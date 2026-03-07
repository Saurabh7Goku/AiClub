'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Idea, VoteType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { getUserNameColor, getHighestBadge } from '@/lib/gamification';

interface IdeaCardProps {
  idea: Idea;
  userVote?: VoteType | null;
  onVote?: (ideaId: string, voteType: VoteType) => void;
  votingDisabled?: boolean;
  submitterReputation?: number;
}

export default function IdeaCard({ idea, userVote, onVote, votingDisabled, submitterReputation = 0 }: IdeaCardProps) {
  const nameColor = getUserNameColor(submitterReputation);
  const badge = getHighestBadge(submitterReputation);
  const statusConfig = {
    open: { label: 'Active Node', class: 'bg-accent-500 text-black border-accent-600' },
    under_review: { label: 'In Audit', class: 'bg-amber-500 text-black border-amber-600' },
    approved: { label: 'Validated', class: 'bg-primary-500 text-black border-primary-600' },
    rejected: { label: 'Archived', class: 'bg-gray-300 text-gray-900 border-gray-400' },
  };

  const categoryConfig = {
    LLM: { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    Vision: { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-accent-500', bg: 'bg-accent-500/10' },
    Infra: { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    Agents: { icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 4a2 2 0 100-4m0 4a2 2 0 110-4', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    Research: { icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    Other: { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  };

  const handleVote = (voteType: VoteType) => {
    if (onVote && !votingDisabled && userVote !== voteType) {
      onVote(idea.id, voteType);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-white/10 hover:border-accent-500/30 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] transition-all group duration-300">
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
        {/* Scientific Category Icon - Mobile Hidden */}
        <div className={`hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center flex-shrink-0 transition-all border border-white/5 shadow-inner ${categoryConfig[idea.category as keyof typeof categoryConfig]?.bg || 'bg-white/5'} ${categoryConfig[idea.category as keyof typeof categoryConfig]?.color || 'text-gray-400'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={categoryConfig[idea.category as keyof typeof categoryConfig]?.icon || categoryConfig.Other.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.2em] border ${statusConfig[idea.status].class.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-black', 'text-black font-extrabold').replace('text-gray-900', 'text-white')}`}>
              {statusConfig[idea.status].label}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              {idea.category}
            </span>

            {/* Mobile-only vote score inline badge */}
            <div className="sm:hidden ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className={`text-[10px] font-bold ${idea.voteScore > 0 ? 'text-accent-400' : idea.voteScore < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {idea.voteScore > 0 ? `+${idea.voteScore}` : idea.voteScore}
              </span>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </div>
          </div>

          <Link href={`/ideas/${idea.id}`} className="block group/title">
            <h3 className="text-xl sm:text-2xl font-extrabold text-[rgb(var(--foreground-rgb))] group-hover/title:text-accent-400 transition-colors leading-tight line-clamp-2">
              {idea.title}
            </h3>
          </Link>

          <p className="text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed">
            {idea.problemStatement}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${badge.glowColor}`}>
                {idea.submittedBy.displayName.charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-semibold ${nameColor}`}>{idea.submittedBy.displayName.split(' ')[0]}</span>
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <Image src={badge.image} alt={badge.name} width={40} height={40} className="w-full h-full object-contain rounded-lg" title={badge.name} />
              </div>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-500">{formatDistanceToNow(idea.createdAt, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Voting Portal - Always Visible */}
        <div className="flex sm:flex-col items-center p-1.5 rounded-xl bg-background border border-white/10 shadow-inner min-w-[3.5rem] gap-2 sm:gap-0 mt-4 sm:mt-0 ml-auto sm:ml-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleVote('in');
            }}
            disabled={votingDisabled}
            className={`p-2 rounded-lg transition-all ${userVote === 'in'
              ? 'bg-accent-500/20 text-accent-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]'
              : 'text-gray-500 hover:bg-white/5 hover:text-accent-400'
              } ${votingDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <svg className={`w-5 h-5 ${userVote === 'in' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <div className="px-2 sm:py-2 flex flex-col items-center">
            <span className={`text-sm font-extrabold tracking-tight ${idea.voteScore > 0 ? 'text-accent-400' : idea.voteScore < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
              {idea.voteScore > 0 ? `+${idea.voteScore}` : idea.voteScore}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleVote('out');
            }}
            disabled={votingDisabled}
            className={`p-2 rounded-lg transition-all ${userVote === 'out'
              ? 'bg-red-500/20 text-red-400 shadow-[inset_0_0_10px_rgba(248,113,113,0.2)]'
              : 'text-gray-500 hover:bg-white/5 hover:text-red-400'
              } ${votingDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <svg className={`w-5 h-5 ${userVote === 'out' ? 'drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
