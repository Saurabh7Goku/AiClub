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
        const timeoutId = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-transparent">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                    <span className="text-2xl opacity-50">💬</span>
                </div>
                <p className="text-gray-400 font-medium text-xs">No messages yet. Start the conversation.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 bg-transparent flex flex-col custom-scrollbar">
            <div className="flex-1" />
            {messages.map((msg) => (
                <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwn={msg.uid === currentUserId}
                    onReplyClick={onReplyClick}
                />
            ))}
            <div ref={bottomRef} className="h-2" />
        </div>
    );
}
