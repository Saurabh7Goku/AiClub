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
            setError("Failed to load channels.");
        });

        return () => unsubscribe();
    }, [currentClub]);

    const textChannels = channels.filter(c => c.type === 'text');
    const announcementChannels = channels.filter(c => c.type === 'announcement');

    const canCreate = isLeader || isAdmin;

    if (!currentClub) return <div className="p-3 text-center text-gray-400 font-medium text-xs">Select a club</div>;

    if (error) {
        return (
            <div className={`p-3 text-center ${isCollapsed ? 'hidden' : ''}`}>
                <p className="text-[10px] text-rose-500 font-bold mb-1">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[9px] uppercase font-bold tracking-widest text-accent-500 hover:text-accent-400">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar transition-all duration-500">
            {/* Club Name Header */}
            {!isCollapsed ? (
                <div className="px-3 py-2 mb-3 border-b border-white/5">
                    <h2 className="font-bold text-[rgb(var(--foreground-rgb))] uppercase tracking-[0.15em] text-[10px] truncate bg-accent-500/10 inline-block px-3 py-1.5 rounded-lg border border-accent-500/20">
                        {currentClub.name}
                    </h2>
                </div>
            ) : (
                <div className="flex justify-center mb-4">
                    <div className="w-8 h-8 rounded-lg bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-500 font-bold text-[10px]">
                        {currentClub.name.charAt(0)}
                    </div>
                </div>
            )}

            <div className={`space-y-5 ${isCollapsed ? 'px-1' : 'px-2'}`}>
                {/* Announcement Channels */}
                {announcementChannels.length > 0 && (
                    <div>
                        <div className={`flex items-center justify-between px-1.5 mb-1.5 ${isCollapsed ? 'justify-center' : ''}`}>
                            <span className={`text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-1.5 ${isCollapsed ? 'hidden' : ''}`}>
                                <span className="w-1 h-1 rounded-full bg-accent-500" />
                                Announcements
                            </span>
                            {isCollapsed && <span className="w-0.5 h-3 bg-accent-500/20 rounded-full" />}
                        </div>
                        <div className="space-y-0.5">
                            {announcementChannels.map(channel => (
                                <Link
                                    key={channel.id}
                                    href={`/chat/${channel.id}`}
                                    onClick={onSelect}
                                    title={isCollapsed ? channel.name : undefined}
                                    className={`flex items-center rounded-lg transition-all duration-200 group ${isCollapsed ? 'justify-center p-1.5' : 'px-2 py-1.5'} ${pathname === `/chat/${channel.id}`
                                        ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                                        : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                                        }`}
                                >
                                    <span className={`text-sm transition-all ${isCollapsed ? 'mr-0' : 'mr-2'} ${pathname === `/chat/${channel.id}` ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>📢</span>
                                    <span className={`font-bold text-[10px] truncate tracking-wider uppercase ${isCollapsed ? 'hidden' : ''} ${pathname === `/chat/${channel.id}` ? 'text-white' : ''}`}>
                                        {channel.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Text Channels */}
                <div>
                    <div className={`flex items-center justify-between px-1.5 mb-1.5 ${isCollapsed ? 'justify-center' : ''}`}>
                        <span className={`text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-1.5 ${isCollapsed ? 'hidden' : ''}`}>
                            <span className="w-1 h-1 rounded-full bg-blue-500" />
                            Channels
                        </span>
                        {isCollapsed ? (
                            <span className="w-0.5 h-3 bg-blue-500/20 rounded-full" />
                        ) : canCreate && (
                            <button
                                onClick={onAddChannel}
                                className="text-gray-500 hover:text-accent-400 p-1 rounded transition-all hover:bg-accent-500/10"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        {textChannels.map(channel => (
                            <Link
                                key={channel.id}
                                href={`/chat/${channel.id}`}
                                onClick={onSelect}
                                title={isCollapsed ? channel.name : undefined}
                                className={`flex items-center rounded-lg transition-all duration-200 group ${isCollapsed ? 'justify-center p-1.5' : 'px-2 py-1.5'} ${pathname === `/chat/${channel.id}`
                                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                                    : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                                    }`}
                            >
                                <span className={`text-base font-bold font-mono transition-all ${isCollapsed ? 'mr-0' : 'mr-2'} ${pathname === `/chat/${channel.id}` ? 'text-accent-500' : 'opacity-30 group-hover:text-accent-500 group-hover:opacity-100'}`}>#</span>
                                <span className={`font-bold text-[10px] truncate tracking-wider uppercase ${isCollapsed ? 'hidden' : ''} ${pathname === `/chat/${channel.id}` ? 'text-white' : ''}`}>
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
