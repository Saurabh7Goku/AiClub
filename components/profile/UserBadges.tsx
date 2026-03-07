'use client';

import { getEarnedBadges, getHighestBadge, getNextBadge, getProgressToNextBadge, Badge } from '@/lib/gamification';
import Image from 'next/image';

interface UserBadgesProps {
  reputationScore: number;
  displayName: string;
  compact?: boolean; // For inline use (e.g., in IdeaCard)
}

export default function UserBadges({ reputationScore, displayName, compact = false }: UserBadgesProps) {
  const earnedBadges = getEarnedBadges(reputationScore);
  const highestBadge = getHighestBadge(reputationScore);
  const nextBadge = getNextBadge(reputationScore);
  const progress = getProgressToNextBadge(reputationScore);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${highestBadge.nameColor}`}>
          {displayName.split(' ')[0]}
        </span>
        <Image src={highestBadge.image} alt={highestBadge.name} width={56} height={56} className="w-14 h-14 object-contain rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 border border-white/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
          Reputation & Badges
        </h3>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-lg font-extrabold text-amber-400">{reputationScore}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 ml-1">pts</span>
        </div>
      </div>

      {/* Current Rank */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Image src={highestBadge.image} alt={highestBadge.name} width={128} height={128} className="w-32 h-32 object-contain rounded-2xl" />
        <div>
          <p className={`text-sm font-extrabold uppercase tracking-wider ${highestBadge.nameColor}`}>
            {highestBadge.name}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">{highestBadge.description}</p>
        </div>
      </div>

      {/* Progress to Next Badge */}
      {nextBadge && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-gray-500">Next: <Image src={nextBadge.image} alt={nextBadge.name} width={64} height={64} className="inline w-16 h-16 object-contain mr-1 rounded-md" /> {nextBadge.name}</span>
            <span className="text-gray-400">{reputationScore}/{nextBadge.minReputation}</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-accent-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* All Badges */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        {earnedBadges.map((badge) => (
          <div
            key={badge.id}
            className={`flex flex-col items-center p-2 rounded-xl ${badge.glowColor.replace(/border-[^\s]+/, '')} transition-transform hover:scale-105`}
            title={`${badge.name}: ${badge.description}`}
          >
            <Image 
              src={badge.image} 
              alt={badge.name} 
              width={112} 
              height={112}
              className="w-28 h-28 object-contain mb-1 block rounded-xl" 
              onError={(e) => console.error('Failed to load badge image:', badge.image, e)}
            />
            <span className="text-[8px] font-bold uppercase tracking-wider mt-1 opacity-70 text-center leading-tight">
              {badge.name}
            </span>
          </div>
        ))}

        {/* Locked badges (dimmed) */}
        {(() => {
          const lockedBadges = getLockedBadges(reputationScore);
          return lockedBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] opacity-30 transition-transform hover:scale-105"
              title={`${badge.name}: Earn ${badge.minReputation} reputation to unlock`}
            >
            <Image 
              src={badge.image} 
              alt={badge.name} 
              width={112} 
              height={112}
              className="w-28 h-28 object-contain mb-1 block grayscale opacity-50 rounded-xl" 
              onError={(e) => console.error('Failed to load locked badge image:', badge.image, e)}
            />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1 opacity-70 text-center leading-tight">
                {badge.name}
              </span>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

function getLockedBadges(reputationScore: number): Badge[] {
  const { BADGES } = require('@/lib/gamification');
  return BADGES.filter((b: Badge) => b.minReputation > reputationScore);
}
