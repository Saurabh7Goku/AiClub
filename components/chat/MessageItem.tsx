'use client';

import { ChatMessage } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import PollRenderer from './PollRenderer';
import { useAuth } from '@/context/AuthContext';
import { addReaction, removeReaction } from '@/lib/firebase/firestore';
import { CloudIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface MessageItemProps {
    message: ChatMessage;
    isOwn: boolean;
    onReplyClick?: (message: ChatMessage) => void;
    showReplyButton?: boolean;
}

export default function MessageItem({ message, isOwn, onReplyClick, showReplyButton = true }: MessageItemProps) {
    const { user } = useAuth();

    // Simple check for mentions
    const isMentioned = message.content?.includes('@here') || message.content?.includes('@everyone');

    const handleReaction = async (emoji: string) => {
        if (!user) return;

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions?.find(r => r.emoji === emoji);
        const hasReacted = existingReaction?.users.includes(user.uid);

        try {
            if (hasReacted) {
                await removeReaction(message.id, emoji, user.uid);
            } else {
                await addReaction(message.id, emoji, user.uid);
            }
        } catch (error) {
            console.error("Error toggling reaction:", error);
        }
    };

    return (
        <div className={`flex w-full group ${isOwn ? 'justify-end' : 'justify-start'} mb-3`} id={`msg-${message.id}`}>
            {!isOwn && (
                <div className="w-7 h-7 rounded-lg bg-card border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                    <span className="text-[rgb(var(--foreground-rgb))] font-extrabold text-[10px] uppercase">{message.displayName.charAt(0)}</span>
                </div>
            )}

            <div className={`flex flex-col max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                    <div className="flex items-baseline space-x-2 mb-1.5 px-1">
                        <span className="text-xs font-extrabold text-[rgb(var(--foreground-rgb))] tracking-wide">{message.displayName}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {message.createdAt ? formatDistanceToNow(message.createdAt, { addSuffix: true }) : 'just now'}
                        </span>
                    </div>
                )}

                <div className={`relative px-3.5 py-2 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.1)] border ${isOwn
                    ? 'bg-accent-500/15 border-accent-500/30 text-[rgb(var(--foreground-rgb))] rounded-tr-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : isMentioned
                        ? 'bg-amber-500/15 border-amber-500/40 text-[rgb(var(--foreground-rgb))] rounded-tl-sm shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] rounded-tl-sm'
                    }`}>
                    {/* Main Message Content rendered with dangerouslySetInnerHTML from Quill */}
                    {message.type === 'poll' && message.pollData ? (
                        <PollRenderer messageId={message.id} pollData={message.pollData} />
                    ) : (
                            <div
                                className="prose prose-sm prose-p:my-0.5 prose-a:text-accent-400 prose-a:font-bold break-words max-w-none text-[13px] font-medium leading-relaxed prose-code:text-accent-300 prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg dark:prose-invert"
                                dangerouslySetInnerHTML={{ __html: message.richText || `<p>${message.content}</p>` }}
                            />
                    )}

                    {/* Attachments rendering */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {message.attachments.map((at, idx) => (
                                <a
                                    key={idx}
                                    href={at.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2.5 bg-background border border-white/10 rounded-xl hover:bg-card transition-all group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-accent-500/10 rounded-lg border border-accent-500/20">
                                            <CloudIcon className="w-4 h-4 text-accent-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[rgb(var(--foreground-rgb))] group-hover:text-accent-400 transition-colors truncate max-w-[140px] md:max-w-[200px]">{at.name}</span>
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">OneDrive Node</span>
                                        </div>
                                    </div>
                                    <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Quick Action popup */}
                    <div className={`absolute top-0 -mt-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-white/10 rounded-xl px-1.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10 ${isOwn ? 'left-0 -ml-10' : 'right-0 -mr-10'}`}>
                        <button onClick={() => handleReaction('👍')} className="text-xs p-1 hover:bg-white/10 rounded-lg transition-colors hover:scale-110">👍</button>
                        <button onClick={() => handleReaction('❤️')} className="text-xs p-1 hover:bg-white/10 rounded-lg transition-colors hover:scale-110">❤️</button>
                        <button onClick={() => handleReaction('🔥')} className="text-xs p-1 hover:bg-white/10 rounded-lg transition-colors hover:scale-110">🔥</button>
                        {showReplyButton && (
                            <button
                                onClick={() => onReplyClick?.(message)}
                                className="text-xs p-1 hover:bg-white/10 rounded-lg transition-colors hover:scale-110"
                                title="Reply in thread"
                            >
                                💬
                            </button>
                        )}
                    </div>
                </div>

                {/* Display Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 z-10">
                        {message.reactions.map(reaction => {
                            const hasReacted = user && reaction.users.includes(user.uid);
                            return (
                                <button
                                    key={reaction.emoji}
                                    onClick={() => handleReaction(reaction.emoji)}
                                    className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border text-[10px] font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${hasReacted
                                        ? 'bg-accent-500/20 border-accent-500/40 text-accent-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs">{reaction.emoji}</span>
                                    <span>{reaction.users.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Thread Info under message */}
                {message.replyCount > 0 && showReplyButton && (
                    <button
                        onClick={() => onReplyClick?.(message)}
                        className="mt-2 ml-2 px-3 py-1.5 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 text-xs font-bold text-accent-400 rounded-xl flex items-center transition-all shadow-inner hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    >
                        <svg className="w-3.5 h-3.5 mr-1.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                    </button>
                )}

                {isOwn && (
                    <div className="flex items-baseline space-x-2 mt-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {message.createdAt ? formatDistanceToNow(message.createdAt, { addSuffix: true }) : 'just now'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
