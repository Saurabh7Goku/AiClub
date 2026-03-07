'use client';

import { ReactNode, useState } from 'react';
import ChannelList from '@/components/chat/ChannelList';
import CreateChannelModal from '@/components/chat/CreateChannelModal';
import { useClub } from '@/context/ClubContext';
import { useAuth } from '@/context/AuthContext';
import { createChannel } from '@/lib/firebase/firestore';
import { ChannelType } from '@/types';

export default function ChatLayout({ children }: { children: ReactNode }) {
    const { currentClub } = useClub();
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleCreateChannel = async (name: string, description: string, type: ChannelType) => {
        if (!currentClub || !user) return;
        await createChannel(currentClub.id, name, description, type, user.uid);
    };

    return (
        <div className="flex h-full border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-card text-[rgb(var(--foreground-rgb))] relative transition-all duration-500">
            <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
            
            {/* Sidebar for Channels - Desktop & Mobile */}
            <div className={`
                ${isMobileMenuOpen ? 'flex' : (isSidebarCollapsed ? 'hidden md:flex w-20' : 'hidden md:flex w-72')} 
                absolute md:relative z-40 md:z-10
                h-full border-r border-white/10 bg-card 
                flex-shrink-0 flex-col
                transition-all duration-500 ease-in-out
            `}>
                <div className="flex-1 overflow-hidden relative group">
                    <ChannelList 
                        onSelect={() => setIsMobileMenuOpen(false)} 
                        onAddChannel={() => setIsCreateModalOpen(true)}
                        isCollapsed={isSidebarCollapsed}
                    />
                    
                    {/* Collapse Toggle - Desktop Only */}
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white/10 border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 hover:bg-accent-500 hover:text-black hover:border-accent-500"
                    >
                        <svg className={`w-3 h-3 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 overflow-hidden">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center h-14 px-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="ml-3 text-xs font-bold uppercase tracking-[0.2em] text-accent-500">Comm Array</span>
                </div>
                {children}
            </div>

            {/* Centered Create Channel Modal */}
            <CreateChannelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateChannel}
            />
        </div>
    );
}
