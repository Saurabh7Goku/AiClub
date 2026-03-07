'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { useAuth } from '@/context/AuthContext';
import { subscribeToChannels, createChannel } from '@/lib/firebase/firestore';
import { Channel, ChannelType } from '@/types';
import CreateChannelModal from './CreateChannelModal';

interface ChannelListProps {
    onSelect?: () => void;
    onAddChannel?: () => void;
    isCollapsed?: boolean;
}

export default function ChannelList({ onSelect, onAddChannel, isCollapsed }: ChannelListProps) {
    const { currentClub } = useClub();
    const { user, isLeader, isAdmin } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        if (!currentClub) return;

        const unsubscribe = subscribeToChannels(currentClub.id, (fetchedChannels) => {
            setChannels(fetchedChannels);
            setError(null);
        }, (err: any) => {
            console.error("Channel subscription error:", err);
            setError("Failed to load channels. Indexing might be in progress.");
        });

        return () => unsubscribe();
    }, [currentClub]);

    const textChannels = channels.filter(c => c.type === 'text');
    const announcementChannels = channels.filter(c => c.type === 'announcement');

    const canCreate = isLeader || isAdmin;

    if (!currentClub) return <div className="p-4 text-center text-gray-400 font-medium">Select a club</div>;

    if (error) {
        return (
            <div className={`p-4 text-center ${isCollapsed ? 'hidden' : ''}`}>
                <p className="text-xs text-rose-500 font-bold mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[10px] uppercase font-bold tracking-widest text-accent-500 hover:text-accent-400">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar transition-all duration-500">
            {/* Club Name Header */}
            {!isCollapsed ? (
                <div className="px-5 py-4 mb-6 border-b border-white/5 bg-white/[0.01]">
                    <h2 className="font-extrabold text-white uppercase tracking-[0.2em] text-[11px] truncate bg-accent-500/10 inline-block px-4 py-2 rounded-xl border border-accent-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        {currentClub.name}
                    </h2>
                </div>
            ) : (
                <div className="flex justify-center mb-8">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-500 font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        {currentClub.name.charAt(0)}
                    </div>
                </div>
            )}

            <div className={`space-y-8 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                {/* Announcement Channels */}
                {announcementChannels.length > 0 && (
                    <div>
                        <div className={`flex items-center justify-between px-2 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
                            <span className={`text-[9px] font-black text-gray-500 uppercase tracking-[0.25em] flex items-center gap-2 ${isCollapsed ? 'hidden' : ''}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                Transmissions
                            </span>
                            {isCollapsed && <span className="w-1 h-4 bg-accent-500/20 rounded-full" />}
                        </div>
                        <div className="space-y-1.5">
                            {announcementChannels.map(channel => (
                                <Link
                                    key={channel.id}
                                    href={`/chat/${channel.id}`}
                                    onClick={onSelect}
                                    title={isCollapsed ? channel.name : undefined}
                                    className={`flex items-center rounded-xl transition-all duration-300 group ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'} ${pathname === `/chat/${channel.id}`
                                        ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                        : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                                        }`}
                                >
                                    <span className={`text-lg transition-all duration-300 ${isCollapsed ? 'mr-0 scale-110' : 'mr-3'} ${pathname === `/chat/${channel.id}` ? 'opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'opacity-40 group-hover:opacity-100'}`}>📢</span>
                                    <span className={`font-bold text-xs truncate tracking-widest uppercase transition-all duration-300 ${isCollapsed ? 'hidden' : ''} ${pathname === `/chat/${channel.id}` ? 'text-white' : ''}`}>
                                        {channel.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Text Channels */}
                <div>
                    <div className={`flex items-center justify-between px-2 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
                        <span className={`text-[9px] font-black text-gray-500 uppercase tracking-[0.25em] flex items-center gap-2 ${isCollapsed ? 'hidden' : ''}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            Comms Array
                        </span>
                        {isCollapsed ? (
                             <span className="w-1 h-4 bg-blue-500/20 rounded-full" />
                        ) : canCreate && (
                            <button
                                onClick={onAddChannel}
                                className="text-gray-500 hover:text-accent-400 p-1.5 rounded-lg transition-all hover:bg-accent-500/10 border border-transparent hover:border-accent-500/20"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {textChannels.map(channel => (
                            <Link
                                key={channel.id}
                                href={`/chat/${channel.id}`}
                                onClick={onSelect}
                                title={isCollapsed ? channel.name : undefined}
                                className={`flex items-center rounded-xl transition-all duration-300 group ${isCollapsed ? 'justify-center p-2' : 'px-4 py-2.5'} ${pathname === `/chat/${channel.id}`
                                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                    : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                                    }`}
                            >
                                <span className={`text-xl font-black font-mono transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-3'} ${pathname === `/chat/${channel.id}` ? 'text-accent-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'opacity-30 group-hover:text-accent-500 group-hover:opacity-100'}`}>#</span>
                                <span className={`font-bold text-xs truncate tracking-[0.1em] uppercase transition-all duration-300 ${isCollapsed ? 'hidden' : ''} ${pathname === `/chat/${channel.id}` ? 'text-white' : ''}`}>
                                    {channel.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
