'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Idea, IdeaStatus, IdeaCategory, VoteType, Comment } from '@/types';
import { createOrUpdateVote, getVote, addComment, subscribeToIdea, subscribeToComments } from '@/lib/firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function IdeaDetailPage() {
  const params = useParams();
  const ideaId = params.id as string;
  const { user } = useAuth();
  const { clubs, loading: clubsLoading } = useClub();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!ideaId || clubsLoading) return;

    const unsubscribe = subscribeToIdea(
      ideaId,
      (ideaData) => {
        if (!ideaData) {
          setError('Research Node Not Found');
          setLoading(false);
          return;
        }

        // Check if user has access to this club
        if (ideaData.clubId) {
          const hasAccess = clubs.some(c => c.id === ideaData.clubId);
          if (!hasAccess && !clubsLoading) {
            setError('Security Level Insufficient');
            setLoading(false);
            return;
          }
        }

        setIdea(ideaData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching idea:', err);
        setError('Connection Protocol Failed');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ideaId, clubs, clubsLoading]);

  useEffect(() => {
    if (!user || !ideaId) return;
    const loadVote = async () => {
      const vote = await getVote(ideaId, user.uid);
      if (vote) setUserVote(vote.vote);
    };
    loadVote();
  }, [user, ideaId]);

  useEffect(() => {
    if (!ideaId) return;
    const unsubscribe = subscribeToComments(ideaId, (newComments) => {
      setComments(newComments);
    });
    return () => unsubscribe();
  }, [ideaId]);

  const handleVote = async (voteType: VoteType) => {
    if (!user || !ideaId || voting) return;
    // If user already voted the same way, skip
    if (userVote === voteType) return;
    try {
      setVoting(true);
      // Optimistic update for the button state
      const previousVote = userVote;
      setUserVote(voteType);
      
      await createOrUpdateVote(ideaId, user.uid, voteType);
    } catch (error) {
      console.error('Error voting:', error);
      // Rollback on error
      const vote = await getVote(ideaId, user.uid);
      setUserVote(vote?.vote || null);
    } finally {
      setVoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      await addComment(ideaId, user.uid, user.displayName || 'Anonymous', newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Retrieving Dossier...</p>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-elevator-in">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4v2m0 4v2M4 21h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white uppercase tracking-wider">{error || 'Access Denied'}</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto font-medium">The requested intelligence node could not be localized.</p>
        </div>
        <Link href="/ideas" className="btn-primary py-2.5 px-8 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow">Return to Directory</Link>
      </div>
    );
  }

  const statusConfig = {
    open: { label: 'Active Node', class: 'bg-accent-500/10 text-accent-400 border-accent-500/20' },
    under_review: { label: 'In Audit', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    approved: { label: 'Validated', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    rejected: { label: 'Archived', class: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Navigation */}
      <Link href="/ideas" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-accent-400 transition-colors outline-none mb-2">
        <span>&larr;</span> Back to Repository
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-[0_0_30px_rgba(0,0,0,0.5)] space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${statusConfig[idea.status].class}`}>
                  {statusConfig[idea.status].label}
                </span>
                <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10">
                  {idea.category}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                {idea.title}
              </h1>

              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400 text-[9px]">
                    {idea.submittedBy.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-300 font-medium">{idea.submittedBy.displayName}</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                <span className="font-medium text-gray-400">{formatDistanceToNow(idea.createdAt, { addSuffix: true })}</span>
              </div>
            </div>

            <div className="space-y-8 border-t border-white/10 pt-8">
              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80">Hypothesis</h2>
                <p className="text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
                  {idea.problemStatement}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80">Methodology</h2>
                <p className="text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
                  {idea.proposedAiUsage}
                </p>
              </section>
            </div>

            {idea.tags && idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10 mt-6">
                {idea.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-white/5 text-gray-400 rounded-md text-[9px] font-bold uppercase tracking-widest border border-white/10 hover:border-accent-500/30 transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span> Discourse ({comments.length})
            </h3>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
              <form onSubmit={handleAddComment} className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Contribute technical feedback or feasibility notes..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-medium text-white placeholder-gray-500 focus:ring-1 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all min-h-[120px] resize-none shadow-inner"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="btn-primary py-3 px-8 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow"
                  >
                    {submittingComment ? 'Sending...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                  Awaiting Initial Feedback
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-3 hover:border-accent-500/30 transition-colors">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 text-[10px] font-bold border border-white/10">
                          {comment.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{comment.displayName}</span>
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-gray-300 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Metrics */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote('in')}
                disabled={voting}
                className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all border ${userVote === 'in'
                  ? 'bg-accent-500/10 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-accent-500/30 hover:bg-white/10'
                  } ${voting ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7-7" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-widest">Signal In</span>
              </button>

              <button
                onClick={() => handleVote('out')}
                disabled={voting}
                className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all border ${userVote === 'out'
                  ? 'bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-red-500/30 hover:bg-white/10'
                  } ${voting ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-widest">Signal Out</span>
              </button>
            </div>

            <div className="space-y-4 pt-5 border-t border-white/10">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Net Signal</span>
                <span className={`text-2xl font-extrabold tracking-tight leading-none ${idea.voteScore >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
                  {idea.voteScore > 0 ? `+${idea.voteScore}` : idea.voteScore}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Velocity</span>
                <span className="text-lg font-bold text-white tracking-tight leading-none italic">
                  {idea.trendingVelocity.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Votes</span>
                <span className="text-lg font-bold text-white tracking-tight leading-none">
                  {idea.votesIn + idea.votesOut}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-accent-500/20 p-6 rounded-3xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/10 blur-3xl rounded-full"></div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-500 relative z-10">Audit Protocol</h4>
            <p className="text-xs font-medium leading-relaxed text-gray-400 relative z-10">
              When a research node achieves 7+ verified community signals, it transitions to validated status.
            </p>
            <button className="w-full border border-white/20 text-white font-bold py-3 pt-3.5 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all text-[11px] uppercase tracking-widest shadow-sm relative z-10">
              Request Validation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
