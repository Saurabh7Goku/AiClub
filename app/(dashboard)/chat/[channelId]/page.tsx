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

        // We need to fetch the channel data to know its type (text vs announcement)
        // For simplicity, we subscribe to all channels and find the one we need.
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
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-accent-500 mb-4"></div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Initializing Comm Link...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col p-8 text-center animate-elevator-in">
                <div className="text-4xl mb-4 opacity-80">🚧</div>
                <h2 className="text-xl font-extrabold text-white mb-2 uppercase tracking-wide">Signal Interrupted</h2>
                <p className="text-gray-400 font-medium mb-6 max-w-xs text-sm">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow"
                >
                    Re-establish Connection
                </button>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col animate-elevator-in">
                <h2 className="text-xl font-extrabold text-white mb-3 uppercase tracking-wide">Channel Not Located</h2>
                <button onClick={() => router.push('/chat')} className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow">
                    Return to Directory
                </button>
            </div>
        );
    }

    const canPost = channel.type === 'text' || isLeader || isAdmin;

    return (
        <div className="flex h-full relative overflow-hidden bg-transparent">
            {/* Main Channel Layout */}
            <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${activeThread ? 'w-full md:w-[calc(100%-24rem)]' : 'w-full'}`}>
                {/* Channel Header - Solid & Immersive */}
                <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-10 bg-[rgb(var(--background-rgb))] shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-2xl shadow-inner group transition-transform hover:scale-105">
                            <span className="opacity-80 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                                {channel.type === 'announcement' ? '📢' : '#'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-xl font-black text-[rgb(var(--foreground-rgb))] tracking-tight uppercase leading-none">
                                    {channel.name}
                                </h1>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${channel.type === 'announcement' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'}`}>
                                    {channel.type}
                                </span>
                            </div>
                            {channel.description && (
                                <p className="text-[12px] font-semibold text-gray-500 leading-none tracking-wide">
                                    {channel.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex -space-x-3 overflow-hidden">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[rgb(var(--card-bg))] bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-[10px] font-bold text-accent-500 group-hover:scale-110 transition-transform cursor-pointer shadow-lg">
                                    U{i}
                                </div>
                            ))}
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[rgb(var(--card-bg))] bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 cursor-pointer shadow-lg">
                                +
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Area - Solid Base */}
                <div className="flex-1 min-h-0 relative bg-[rgb(var(--background-rgb))] flex flex-col">
                    <MessageList
                        messages={messages}
                        currentUserId={user?.uid || ''}
                        onReplyClick={(msg) => setActiveThread(msg)}
                    />
                </div>

                {/* Input Area - Solid Container */}
                <div className="px-6 pb-6 pt-2 bg-[rgb(var(--background-rgb))] relative z-10">
                    {canPost ? (
                        <div className="bg-[rgb(var(--card-bg))] rounded-2xl border border-white/10 p-2 shadow-2xl focus-within:border-accent-500/50 transition-all duration-300">
                            <ChatInput onSendMessage={handleSendMessage} placeholder={`Secure Transmit to #${channel.name}...`} />
                        </div>
                    ) : (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-center text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/80 shadow-inner flex items-center justify-center gap-3">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Transmission restricted to Command Level personnel.
                        </div>
                    )}
                </div>
            </div>

            {/* Thread Panel - Immersive Side Drawer */}
            {activeThread && (
                <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 border-l border-white/10 bg-[rgb(var(--card-bg))] opacity-98 backdrop-blur-3xl z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.4)] animate-in slide-in-from-right duration-500">
                    <ThreadPanel
                        parentMessage={activeThread}
                        onClose={() => setActiveThread(null)}
                    />
                </div>
            )}
        </div>
    );
}
