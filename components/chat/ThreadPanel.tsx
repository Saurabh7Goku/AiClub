'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, PollData } from '@/types';
import { subscribeToThread, sendMessage } from '@/lib/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';

interface ThreadPanelProps {
    parentMessage: ChatMessage;
    onClose: () => void;
}

export default function ThreadPanel({ parentMessage, onClose }: ThreadPanelProps) {
    const { user } = useAuth();
    const { currentClub } = useClub();
    const [replies, setReplies] = useState<ChatMessage[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!currentClub) return;
        const unsub = subscribeToThread(parentMessage.id, currentClub.id, (fetchedReplies) => {
            setReplies(fetchedReplies);
        });
        return () => unsub();
    }, [parentMessage.id, currentClub]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [replies.length]);

    const handleSendReply = async (content: string, richText: string, type: 'text' | 'poll' = 'text', pollData?: PollData, attachments?: any[]) => {
        if (!user || !currentClub) return;
        await sendMessage(
            parentMessage.channelId,
            currentClub.id,
            user.uid,
            user.displayName,
            content,
            type,
            { richText, threadId: parentMessage.id, pollData, attachments }
        );
    };

    return (
        <div className="flex flex-col h-full text-[rgb(var(--foreground-rgb))]">
            <div className="h-11 border-b border-white/10 flex justify-between items-center px-4 bg-white/[0.01] shrink-0">
                <h3 className="font-bold text-[rgb(var(--foreground-rgb))] text-sm tracking-tight flex items-center gap-1.5">
                    <span className="text-accent-500">↳</span> Thread
                </h3>
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-transparent custom-scrollbar">
                {/* Parent Message */}
                <div className="pb-3 border-b border-dashed border-white/15">
                    <MessageItem message={parentMessage} isOwn={parentMessage.uid === user?.uid} showReplyButton={false} />
                </div>

                {/* Replies */}
                <div className="flex flex-col space-y-0.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-accent-500" />
                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                    {replies.map(reply => (
                        <MessageItem key={reply.id} message={reply} isOwn={reply.uid === user?.uid} showReplyButton={false} />
                    ))}
                    <div ref={bottomRef} className="h-1" />
                </div>
            </div>

            <div className="p-2 border-t border-white/10">
                <ChatInput onSendMessage={handleSendReply} placeholder="Reply..." />
            </div>
        </div>
    );
}
