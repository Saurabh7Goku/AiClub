'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToMessages, sendMessage, subscribeToChannels } from '@/lib/firebase/firestore';
import { ChatMessage, Channel, PollData } from '@/types';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import ThreadPanel from '@/components/chat/ThreadPanel';
import { useRouter } from 'next/navigation';

export default function ChannelPage({ params }: { params: { channelId: string } }) {
    const { channelId } = params;
    const { user, isLeader, isAdmin } = useAuth();
    const { currentClub } = useClub();
    const router = useRouter();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [channel, setChannel] = useState<Channel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);

    useEffect(() => {
        if (!currentClub) return;

        const unsubChannels = subscribeToChannels(currentClub.id, (channels) => {
            const found = channels.find(c => c.id === channelId) || null;
            setChannel(found);
        }, (err) => {
            console.error("Channels sub error:", err);
            setError("Error loading channel data.");
        });

        const unsubMessages = subscribeToMessages(channelId, currentClub.id, (fetchedMessages) => {
            setMessages(fetchedMessages);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Messages sub error:", err);
            setLoading(false);
            setError("Error loading messages. Index may be building.");
        });

        return () => {
            unsubChannels();
            unsubMessages();
        };
    }, [channelId, currentClub]);

    const handleSendMessage = async (content: string, richText: string, type: 'text' | 'poll' = 'text', pollData?: PollData, attachments?: any[]) => {
        if (!user || !currentClub || !channel) return;
        await sendMessage(
            channelId,
            currentClub.id,
            user.uid,
            user.displayName,
            content,
            type,
            { richText, pollData, attachments }
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-accent-500 mb-3"></div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col p-6 text-center animate-elevator-in">
                <div className="text-3xl mb-3 opacity-80">🚧</div>
                <h2 className="text-lg font-extrabold text-white mb-1 uppercase tracking-wide">Signal Interrupted</h2>
                <p className="text-gray-400 font-medium mb-4 max-w-xs text-xs">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-widest"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col animate-elevator-in">
                <h2 className="text-lg font-extrabold text-white mb-2 uppercase tracking-wide">Channel Not Found</h2>
                <button onClick={() => router.push('/chat')} className="btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-widest">
                    Back to Channels
                </button>
            </div>
        );
    }

    const canPost = channel.type === 'text' || isLeader || isAdmin;

    return (
        <div className="flex h-full relative overflow-hidden bg-transparent">
            {/* Main Channel */}
            <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${activeThread ? 'w-full md:w-[calc(100%-20rem)]' : 'w-full'}`}>
                {/* Compact Header */}
                <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-10 bg-[rgb(var(--background-rgb))]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-base">
                            <span className="opacity-80">
                                {channel.type === 'announcement' ? '📢' : '#'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-black text-[rgb(var(--foreground-rgb))] tracking-tight uppercase leading-none">
                                    {channel.name}
                                </h1>
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${channel.type === 'announcement' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'}`}>
                                    {channel.type}
                                </span>
                            </div>
                            {channel.description && (
                                <p className="text-[10px] font-medium text-gray-500 leading-none mt-0.5 truncate max-w-xs">
                                    {channel.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="inline-flex h-6 w-6 rounded-full ring-2 ring-[rgb(var(--card-bg))] bg-accent-500/20 border border-accent-500/30 items-center justify-center text-[8px] font-bold text-accent-500 shadow-sm">
                                    U{i}
                                </div>
                            ))}
                            <div className="inline-flex h-6 w-6 rounded-full ring-2 ring-[rgb(var(--card-bg))] bg-white/5 border border-white/10 items-center justify-center text-[8px] font-bold text-gray-400 shadow-sm">
                                +
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 relative bg-[rgb(var(--background-rgb))] flex flex-col">
                    <MessageList
                        messages={messages}
                        currentUserId={user?.uid || ''}
                        onReplyClick={(msg) => setActiveThread(msg)}
                    />
                </div>

                {/* Input */}
                <div className="px-3 pb-3 pt-1 bg-[rgb(var(--background-rgb))] relative z-10">
                    {canPost ? (
                        <div className="bg-[rgb(var(--card-bg))] rounded-xl border border-white/10 p-1.5 shadow-lg focus-within:border-accent-500/50 transition-all duration-300">
                            <ChatInput onSendMessage={handleSendMessage} placeholder={`Message #${channel.name}...`} />
                        </div>
                    ) : (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/80 flex items-center justify-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Announcements Only
                        </div>
                    )}
                </div>
            </div>

            {/* Thread Panel */}
            {activeThread && (
                <div className="absolute right-0 top-0 bottom-0 w-full md:w-80 border-l border-white/10 bg-[rgb(var(--card-bg))] z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-500">
                    <ThreadPanel
                        parentMessage={activeThread}
                        onClose={() => setActiveThread(null)}
                    />
                </div>
            )}
        </div>
    );
}
