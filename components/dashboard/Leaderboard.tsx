'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useClub } from '@/context/ClubContext';
import { getMembers } from '@/lib/firebase/firestore';
import { User } from '@/types';
import { getHighestBadge, getUserNameColor } from '@/lib/gamification';

export default function Leaderboard() {
  const { currentClub } = useClub();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentClub) return;
    const load = async () => {
      try {
        const m = await getMembers(currentClub.id);
        // Sort by reputation descending
        m.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));
        setMembers(m.slice(0, 10)); // Top 10
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentClub]);

  const medalColors = ['text-amber-400', 'text-gray-300', 'text-orange-400'];

  return (
    <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
            Leaderboard
          </h3>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Top 10</span>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="px-5 py-8 text-center">
            <div className="w-6 h-6 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            No members yet
          </div>
        ) : (
          members.map((member, index) => {
            const badge = getHighestBadge(member.reputationScore || 0);
            const nameColor = getUserNameColor(member.reputationScore || 0);

            return (
              <div
                key={member.uid}
                className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                {/* Rank */}
                <div className="w-6 text-center">
                  {index < 3 ? (
                    <span className={`text-sm font-extrabold ${medalColors[index]}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-gray-500">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Image 
                  src={badge.image} 
                  alt={badge.name} 
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain rounded-lg border shrink-0 block bg-white/5" 
                  onError={(e) => console.error('Leaderboard badge failed to load:', badge.image)}
                />

                {/* Name & Badge */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${nameColor}`}>
                    {member.displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold flex items-center mt-1">
                    <Image src={badge.image} alt={badge.name} width={40} height={40} className="w-10 h-10 object-contain mr-2 rounded-lg" />
                    {badge.name}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-sm font-extrabold text-amber-400">{member.reputationScore || 0}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">pts</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
