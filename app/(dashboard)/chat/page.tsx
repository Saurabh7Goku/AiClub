'use client';

import { useClub } from '@/context/ClubContext';

export default function ChatPage() {
    const { currentClub } = useClub();

    return (
        <div className="flex-1 flex items-center justify-center p-8 text-center animate-elevator-in">
            <div className="max-w-md bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 bg-accent-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-accent-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-3 uppercase">
                    Comm Link: {currentClub?.name || 'Node'}
                </h2>
                <p className="text-gray-400 font-medium leading-relaxed">
                    Select a channel from the directory to initiate secure communication protocols. Discuss research hypotheses, distribute files, and coordinate operations.
                </p>
            </div>
        </div>
    );
}
