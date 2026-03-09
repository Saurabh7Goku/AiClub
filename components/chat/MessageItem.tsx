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

    const isMentioned = message.content?.includes('@here') || message.content?.includes('@everyone');

    const handleReaction = async (emoji: string) => {
        if (!user) return;

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
        <div className={`flex w-full group ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5 py-0.5 hover:bg-white/[0.02] px-1 rounded-lg transition-colors`} id={`msg-${message.id}`}>
            {!isOwn && (
                <div className="w-6 h-6 rounded-md bg-card border border-white/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <span className="text-[rgb(var(--foreground-rgb))] font-bold text-[9px] uppercase">{message.displayName.charAt(0)}</span>
                </div>
            )}

            <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                    <div className="flex items-baseline space-x-1.5 mb-0.5 px-0.5">
                        <span className="text-[11px] font-bold text-[rgb(var(--foreground-rgb))] tracking-wide">{message.displayName}</span>
                        <span className="text-[9px] font-medium text-gray-500">
                            {message.createdAt ? formatDistanceToNow(message.createdAt, { addSuffix: true }) : 'now'}
                        </span>
                    </div>
                )}

                <div className={`relative px-3 py-0 rounded-lg shadow-sm border ${isOwn
                    ? 'bg-accent-500/15 border-accent-500/30 text-[rgb(var(--foreground-rgb))] rounded-tr-sm'
                    : isMentioned
                        ? 'bg-amber-500/15 border-amber-500/40 text-[rgb(var(--foreground-rgb))] rounded-tl-sm'
                        : 'bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] rounded-tl-sm'
                    }`}>
                    {message.type === 'poll' && message.pollData ? (
                        <PollRenderer messageId={message.id} pollData={message.pollData} />
                    ) : (
                        <div
                            className="msg-content break-words max-w-none text-[13px] font-medium leading-snug [&_a]:text-accent-400 [&_a]:font-bold [&_code]:text-accent-300 [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-2 [&_blockquote]:text-gray-400 [&_ul]:pl-4 [&_ol]:pl-4"
                            dangerouslySetInnerHTML={{ __html: message.richText || `<p>${message.content}</p>` }}
                        />
                    )}

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {message.attachments.map((at, idx) => (
                                <a
                                    key={idx}
                                    href={at.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2 bg-background border border-white/10 rounded-lg hover:bg-card transition-all group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-accent-500/10 rounded border border-accent-500/20">
                                            <CloudIcon className="w-3 h-3 text-accent-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[rgb(var(--foreground-rgb))] group-hover:text-accent-400 transition-colors truncate max-w-[120px]">{at.name}</span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">OneDrive</span>
                                        </div>
                                    </div>
                                    <ArrowsPointingOutIcon className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className={`absolute top-0 -mt-3 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-white/10 rounded-lg px-1 py-0.5 shadow-lg z-10 ${isOwn ? 'left-0 -ml-8' : 'right-0 -mr-8'}`}>
                        <button onClick={() => handleReaction('👍')} className="text-[10px] p-0.5 hover:bg-white/10 rounded transition-colors">👍</button>
                        <button onClick={() => handleReaction('❤️')} className="text-[10px] p-0.5 hover:bg-white/10 rounded transition-colors">❤️</button>
                        <button onClick={() => handleReaction('🔥')} className="text-[10px] p-0.5 hover:bg-white/10 rounded transition-colors">🔥</button>
                        {showReplyButton && (
                            <button
                                onClick={() => onReplyClick?.(message)}
                                className="text-[10px] p-0.5 hover:bg-white/10 rounded transition-colors"
                                title="Reply in thread"
                            >
                                💬
                            </button>
                        )}
                    </div>
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 z-10">
                        {message.reactions.map(reaction => {
                            const hasReacted = user && reaction.users.includes(user.uid);
                            return (
                                <button
                                    key={reaction.emoji}
                                    onClick={() => handleReaction(reaction.emoji)}
                                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold transition-all hover:scale-105 active:scale-95 ${hasReacted
                                        ? 'bg-accent-500/20 border-accent-500/40 text-accent-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-[10px]">{reaction.emoji}</span>
                                    <span>{reaction.users.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Thread Info */}
                {message.replyCount > 0 && showReplyButton && (
                    <button
                        onClick={() => onReplyClick?.(message)}
                        className="mt-1 px-2 py-1 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 text-[10px] font-bold text-accent-400 rounded-lg flex items-center transition-all"
                    >
                        <svg className="w-3 h-3 mr-1 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                    </button>
                )}

                {isOwn && (
                    <div className="flex items-baseline mt-0.5 px-0.5">
                        <span className="text-[9px] font-medium text-gray-400">
                            {message.createdAt ? formatDistanceToNow(message.createdAt, { addSuffix: true }) : 'now'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
