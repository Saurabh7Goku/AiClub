'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import MessageItem from './MessageItem';

interface MessageListProps {
    messages: ChatMessage[];
    currentUserId: string;
    onReplyClick?: (message: ChatMessage) => void;
}

export default function MessageList({ messages, currentUserId, onReplyClick }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when messages change, using a slight delay to allow DOM updates
        const timeoutId = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                    <span className="text-3xl opacity-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">💬</span>
                </div>
                <p className="text-gray-400 font-medium text-sm">No transmissions on this channel. Initialize communication.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-transparent flex flex-col custom-scrollbar">
            <div className="flex-1" /> {/* Spacer to push messages to bottom if few */}
            {messages.map((msg) => (
                <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwn={msg.uid === currentUserId}
                    onReplyClick={onReplyClick}
                />
            ))}
            <div ref={bottomRef} className="h-4" />
        </div>
    );
}
