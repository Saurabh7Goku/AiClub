'use client';

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { useAuth } from '@/context/AuthContext';
import { getMembers } from '@/lib/firebase/firestore';
import { User } from '@/types';
import { getHighestBadge, getUserNameColor, getEarnedBadges, getNextBadge, getProgressToNextBadge, BADGES, Badge } from '@/lib/gamification';
import UserBadges from '@/components/profile/UserBadges';
import Image from 'next/image';

export default function LeaderboardPage() {
  const { currentClub, loading: clubLoading } = useClub();
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clubLoading) return;
    if (!currentClub) { setLoading(false); return; }

    const load = async () => {
      try {
        const m = await getMembers(currentClub.id);
        m.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));
        setMembers(m);
      } catch (e) {
        console.error('Failed to load members:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentClub, clubLoading]);

  const medalIcons = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Rankings
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tight uppercase leading-none">
          Leaderboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
          Top contributors in <span className="text-black dark:text-white font-black">{currentClub?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Rankings */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top 3 Podium */}
          {members.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 0, 2].map((pos) => {
                const member = members[pos];
                if (!member) return null;
                const badge = getHighestBadge(member.reputationScore || 0);
                const nameColor = getUserNameColor(member.reputationScore || 0);
                const isFirst = pos === 0;

                return (
                  <div
                    key={member.uid}
                    className={`flex flex-col items-center p-5 rounded-2xl border bg-card transition-transform hover:-translate-y-1 duration-300 ${
                      isFirst
                        ? 'border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] -mt-4'
                        : 'border-white/10'
                    }`}
                  >
                    <span className="text-2xl mb-2">{medalIcons[pos]}</span>
                    <Image src={badge.image} alt={badge.name} width={96} height={96} className="w-24 h-24 object-contain rounded-2xl mb-2" />
                    <p className={`text-sm font-bold truncate max-w-full text-center ${nameColor}`}>
                      {member.displayName.split(' ')[0]}
                    </p>
                    <p className="text-[9px] font-medium text-gray-500 mt-1 flex items-center gap-1 justify-center">
                      <Image src={badge.image} alt={badge.name} width={12} height={12} className="w-3 h-3 object-contain" />
                      <span>{badge.name}</span>
                    </p>
                    <p className="text-xl font-extrabold text-amber-400 mt-2">{member.reputationScore || 0}</p>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">points</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full List */}
          <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Member</div>
                <div className="col-span-3">Badge</div>
                <div className="col-span-3 text-right">Score</div>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-3 animate-pulse">Loading rankings...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  No members found
                </div>
              ) : (
                members.map((member, i) => {
                  const badge = getHighestBadge(member.reputationScore || 0);
                  const nameColor = getUserNameColor(member.reputationScore || 0);
                  const isCurrentUser = user?.uid === member.uid;

                  return (
                    <div
                      key={member.uid}
                      className={`grid grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors ${
                        isCurrentUser ? 'bg-accent-500/5 border-l-2 border-l-accent-500' : ''
                      }`}
                    >
                      <div className="col-span-1">
                        {i < 3 ? (
                          <span className="text-sm">{medalIcons[i]}</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                        )}
                      </div>
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <Image src={badge.image} alt={badge.name} width={64} height={64} className="w-16 h-16 object-contain rounded-lg" />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${nameColor}`}>
                            {member.displayName}
                            {isCurrentUser && <span className="text-[8px] ml-1 text-accent-400">(you)</span>}
                          </p>
                          <p className="text-[9px] text-gray-500 font-medium">{member.role}</p>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span className={`text-xs font-bold ${badge.nameColor}`}>
                          {badge.name}
                        </span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-sm font-extrabold text-amber-400">{member.reputationScore || 0}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: My Badges + Badge Legend */}
        <div className="lg:col-span-4 space-y-6">
          {user && (
            <UserBadges
              reputationScore={user.reputationScore || 0}
              displayName={user.displayName}
            />
          )}

          {/* Badge Legend */}
          <div className="bg-card rounded-2xl border border-white/10 p-5 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
              Badge Legend
            </h3>
            <div className="space-y-2">
              {BADGES.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 py-1">
                  <div className="w-20 flex justify-center shrink-0">
                    <Image src={badge.image} alt={badge.name} width={64} height={64} className="w-16 h-16 object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${badge.nameColor}`}>{badge.name}</p>
                    <p className="text-[9px] text-gray-500 font-medium">{badge.description}</p>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500">{badge.minReputation}+</span>
                </div>
              ))}
            </div>
          </div>

          {/* How to Earn */}
          <div className="bg-card rounded-2xl border border-white/10 p-5 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
              How to Earn Points
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { action: 'Vote on an idea', points: '+1' },
                { action: 'Submit a new idea', points: '+5' },
                { action: 'Idea moves to review', points: '+5' },
                { action: 'Idea gets approved', points: '+15' },
                { action: 'Submit to a bounty', points: '+10' },
              ].map((item) => (
                <div key={item.action} className="flex items-center justify-between py-1">
                  <span className="text-gray-400 font-medium">{item.action}</span>
                  <span className="text-accent-400 font-bold">{item.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
