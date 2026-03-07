'use client';

// ==========================================
// Gamification: Badges, Reputation & Colors
// ==========================================

export type BadgeId =
  | 'newcomer'
  | 'contributor'
  | 'innovator'
  | 'visionary'
  | 'critic'
  | 'executioner'
  | 'trailblazer';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  image: string; // path to image, e.g., '/Badges/newcomer.png'
  minReputation: number;
  nameColor: string; // Tailwind text color class for the username
  glowColor: string; // For the badge pill glow
  tier: number; // Higher tier = higher priority badge
}

// Badge definitions ordered by tier (lowest to highest)
export const BADGES: Badge[] = [
  {
    id: 'newcomer',
    name: 'Newcomer',
    description: 'Joined the platform',
    image: '/Badges/badge1.jpg',
    minReputation: 0,
    nameColor: 'text-gray-400',
    glowColor: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
    tier: 0,
  },
  {
    id: 'contributor',
    name: 'Contributor',
    description: 'Earned 10+ reputation points',
    image: '/Badges/badge2.jpg',
    minReputation: 10,
    nameColor: 'text-blue-400',
    glowColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    tier: 1,
  },
  {
    id: 'critic',
    name: 'Critic',
    description: 'Cast 25+ votes on ideas',
    image: '/Badges/badge3.jpg',
    minReputation: 25,
    nameColor: 'text-cyan-400',
    glowColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    tier: 2,
  },
  {
    id: 'innovator',
    name: 'Innovator',
    description: 'Earned 50+ reputation points',
    image: '/Badges/badge4.jpg',
    minReputation: 50,
    nameColor: 'text-emerald-400',
    glowColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    tier: 3,
  },
  {
    id: 'executioner',
    name: 'Executioner',
    description: 'Earned 100+ reputation — top collaborator',
    image: '/Badges/badge5.jpg',
    minReputation: 100,
    nameColor: 'text-fuchsia-400',
    glowColor: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
    tier: 4,
  },
  {
    id: 'visionary',
    name: 'Visionary',
    description: 'Earned 200+ reputation — platform legend',
    image: '/Badges/badge6.jpg',
    minReputation: 200,
    nameColor: 'text-rose-400',
    glowColor: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    tier: 5,
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    description: 'Earned 500+ reputation — the best of the best',
    image: '/Badges/badge7.jpg',
    minReputation: 500,
    nameColor: 'text-amber-400',
    glowColor: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-400',
    tier: 6,
  },
];

// Reputation point values
export const REP_POINTS = {
  VOTE_CAST: 1,           // Casting a vote on any idea
  IDEA_SUBMITTED: 5,      // Submitting a new idea
  IDEA_APPROVED: 15,      // Your idea gets approved by a leader
  IDEA_UNDER_REVIEW: 5,   // Your idea moves to under_review
  BOUNTY_SUBMITTED: 10,   // Submitting an idea to a bounty
  MEETING_ATTENDED: 3,    // Attending a meeting session
};

/**
 * Get all badges a user has earned based on their reputation score.
 */
export function getEarnedBadges(reputationScore: number): Badge[] {
  return BADGES.filter(b => reputationScore >= b.minReputation);
}

/**
 * Get the highest-tier badge the user has earned.
 */
export function getHighestBadge(reputationScore: number): Badge {
  const earned = getEarnedBadges(reputationScore);
  return earned[earned.length - 1] || BADGES[0];
}

/**
 * Get the username text color class based on the user's highest badge.
 */
export function getUserNameColor(reputationScore: number): string {
  return getHighestBadge(reputationScore).nameColor;
}

/**
 * Get the next badge the user can unlock, or null if they have all.
 */
export function getNextBadge(reputationScore: number): Badge | null {
  const next = BADGES.find(b => b.minReputation > reputationScore);
  return next || null;
}

/**
 * Calculate progress percentage towards the next badge.
 */
export function getProgressToNextBadge(reputationScore: number): number {
  const current = getHighestBadge(reputationScore);
  const next = getNextBadge(reputationScore);
  if (!next) return 100;
  const range = next.minReputation - current.minReputation;
  const progress = reputationScore - current.minReputation;
  return Math.min(100, Math.round((progress / range) * 100));
}
