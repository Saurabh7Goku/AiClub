'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export interface Bounty {
  id: string;
  clubId: string;
  title: string;
  description: string;
  category: string;
  bonusReputation: number;
  createdBy: { uid: string; displayName: string };
  status: 'active' | 'closed';
  createdAt: Date;
  submissions: number;
}

export default function BountyBoard() {
  const { user, isLeader } = useAuth();
  const { currentClub } = useClub();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'LLM', bonusReputation: 10 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentClub) { setLoading(false); return; }

    const bountiesRef = collection(db, 'bounties');
    const q = query(bountiesRef, where('clubId', '==', currentClub.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          clubId: data.clubId,
          title: data.title,
          description: data.description,
          category: data.category,
          bonusReputation: data.bonusReputation || 10,
          createdBy: data.createdBy,
          status: data.status,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          submissions: data.submissions || 0,
        } as Bounty;
      });
      setBounties(items);
      setLoading(false);
    }, (err) => {
      console.error('Bounties subscription failed:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentClub]);

  const handleCreate = async () => {
    if (!user || !currentClub || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bounties'), {
        clubId: currentClub.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        bonusReputation: formData.bonusReputation,
        createdBy: { uid: user.uid, displayName: user.displayName },
        status: 'active',
        createdAt: serverTimestamp(),
        submissions: 0,
      });
      setFormData({ title: '', description: '', category: 'LLM', bonusReputation: 10 });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create bounty:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const closeBounty = async (bountyId: string) => {
    try {
      await updateDoc(doc(db, 'bounties', bountyId), { status: 'closed' });
    } catch (err) {
      console.error('Failed to close bounty:', err);
    }
  };

  const categoryColors: Record<string, string> = {
    LLM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Vision: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    Infra: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Agents: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Research: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--foreground-rgb))]">
            Bounties
          </h3>
        </div>
        {isLeader && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[9px] font-bold uppercase tracking-widest text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Post Bounty
          </button>
        )}
      </div>

      {/* Create Form (Leaders Only) */}
      {showForm && isLeader && (
        <div className="px-5 py-4 bg-white/[0.02] border-b border-white/5 space-y-3">
          <input
            type="text"
            placeholder="Bounty title..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm font-medium placeholder-gray-500 focus:outline-none focus:border-accent-500 transition-colors"
          />
          <textarea
            placeholder="Describe what you're looking for..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm font-medium placeholder-gray-500 focus:outline-none focus:border-accent-500 transition-colors resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-2 bg-background border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-accent-500"
            >
              {['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Bonus:</span>
              <input
                type="number"
                min={5}
                max={50}
                value={formData.bonusReputation}
                onChange={(e) => setFormData({ ...formData, bonusReputation: parseInt(e.target.value) || 10 })}
                className="w-16 px-2 py-2 bg-background border border-white/10 rounded-lg text-xs font-bold text-amber-400 focus:outline-none focus:border-accent-500 text-center"
              />
              <span className="text-[9px] font-bold text-amber-400">pts</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !formData.title.trim()}
              className="px-4 py-1.5 bg-accent-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-accent-400 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Bounty List */}
      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="px-5 py-8 text-center">
            <div className="w-6 h-6 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : bounties.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            {isLeader ? 'Post the first bounty for your club!' : 'No active bounties'}
          </div>
        ) : (
          bounties.map((bounty) => (
            <div key={bounty.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${categoryColors[bounty.category] || categoryColors.Other}`}>
                      {bounty.category}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400">
                      +{bounty.bonusReputation} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[rgb(var(--foreground-rgb))] leading-snug">
                    {bounty.title}
                  </h4>
                  {bounty.description && (
                    <p className="text-[11px] text-gray-400 font-medium line-clamp-2">{bounty.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[9px] font-medium text-gray-500">
                    <span>by {bounty.createdBy.displayName.split(' ')[0]}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{formatDistanceToNow(bounty.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    href={`/ideas/new?bounty=${bounty.id}&category=${bounty.category}`}
                    className="px-3 py-1.5 bg-accent-500/10 border border-accent-500/20 text-accent-400 text-[9px] font-bold uppercase tracking-wider rounded-lg hover:bg-accent-500/20 transition-colors"
                  >
                    Submit
                  </Link>
                  {isLeader && user?.uid === bounty.createdBy.uid && (
                    <button
                      onClick={() => closeBounty(bounty.id)}
                      className="text-[8px] font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
