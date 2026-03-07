'use client';

import { PollData } from '@/types';
import { castPollVote } from '@/lib/firebase/firestore';
import { useAuth } from '@/context/AuthContext';

interface PollRendererProps {
    messageId: string;
    pollData: PollData;
}

export default function PollRenderer({ messageId, pollData }: PollRendererProps) {
    const { user } = useAuth();

    const totalVotes = pollData.options.reduce((acc, opt) => acc + opt.votes.length, 0);

    const handleVote = async (optionId: string) => {
        if (!user || pollData.closed) return;
        await castPollVote(messageId, optionId, user.uid);
    };

    return (
        <div className="mt-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] w-full max-w-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="flex items-start justify-between mb-5 relative z-10">
                <h4 className="font-extrabold text-white text-sm leading-snug pr-3 tracking-wide flex items-center gap-2">
                    <span className="text-accent-500">📊</span> {pollData.question}
                </h4>
                {pollData.closed && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)] shrink-0">
                        Terminated
                    </span>
                )}
            </div>

            <div className="space-y-3 relative z-10">
                {pollData.options.map((opt) => {
                    const voteCount = opt.votes.length;
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const hasVoted = user && opt.votes.includes(user.uid);

                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleVote(opt.id)}
                            disabled={pollData.closed || !user}
                            className={`w-full relative overflow-hidden rounded-xl border text-left transition-all duration-300 ${hasVoted
                                ? 'border-accent-500/50 bg-accent-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                : 'border-white/10 hover:border-white/30 bg-white/5'
                                } ${pollData.closed ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-0.5'}`}
                        >
                            <div
                                className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${hasVoted ? 'bg-accent-500/20' : 'bg-white/5'}`}
                                style={{ width: `${percentage}%` }}
                            />
                            <div className="relative px-4 py-3 flex justify-between items-center z-10">
                                <span className={`text-sm tracking-wide ${hasVoted ? 'text-accent-400 font-extrabold' : 'text-gray-300 font-semibold'}`}>
                                    {opt.text}
                                </span>
                                <div className="flex items-center space-x-3">
                                    {hasVoted && (
                                        <svg className="w-4 h-4 text-accent-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${hasVoted ? 'text-accent-500' : 'text-gray-500'}`}>
                                        {percentage}%
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest relative z-10 border-t border-white/10 pt-3">
                <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    {totalVotes} {totalVotes === 1 ? 'record' : 'records'}
                </span>
                {pollData.allowMultiple && (
                    <span className="text-gray-400">Multi-select enabled</span>
                )}
            </div>
        </div>
    );
}
