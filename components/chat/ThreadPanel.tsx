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
        <div className="w-80 md:w-96 border-l border-white/10 bg-card flex flex-col h-full shrink-0 shadow-[-30px_0_60px_rgba(0,0,0,0.4)] z-20 animate-fade-in relative right-0 text-[rgb(var(--foreground-rgb))]">
            <div className="h-16 border-b border-white/10 flex justify-between items-center px-6 bg-white/[0.01] shrink-0">
                <h3 className="font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tight flex items-center gap-2">
                    <span className="text-accent-500">↳</span> Thread
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-transparent custom-scrollbar">
                {/* Parent Message (Original) */}
                <div className="pb-5 border-b border-dashed border-white/20">
                    <MessageItem message={parentMessage} isOwn={parentMessage.uid === user?.uid} showReplyButton={false} />
                </div>

                {/* Replies */}
                <div className="flex flex-col space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                    {replies.map(reply => (
                        <MessageItem key={reply.id} message={reply} isOwn={reply.uid === user?.uid} showReplyButton={false} />
                    ))}
                    <div ref={bottomRef} className="h-2" />
                </div>
            </div>

            <ChatInput onSendMessage={handleSendReply} placeholder="Transmit reply..." />
        </div>
    );
}
