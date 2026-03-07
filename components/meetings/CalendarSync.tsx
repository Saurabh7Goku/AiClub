'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserCalendarIntegrations, getCalendarIntegration } from '@/lib/firebase/firestore';
import { CalendarIntegration } from '@/types';

interface CalendarSyncProps {
    meetingId: string;
    roomName: string;
    meetingStartTime?: Date;
}

/**
 * Sidebar widget for a meeting room to sync meetings with connected calendars.
 * Automatically falls back to simple URL links if no API integration is configured.
 */
export default function CalendarSync({ meetingId, roomName, meetingStartTime }: CalendarSyncProps) {
    const { user } = useAuth();
    const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [syncedTo, setSyncedTo] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            const data = await getUserCalendarIntegrations(user.uid);
            setIntegrations(data);
            setLoading(false);
        };
        load();
    }, [user]);

    const handleSync = useCallback(async (provider: 'google') => {
        if (!user) return;
        setSyncing(provider);

        try {
            const integration = await getCalendarIntegration(user.uid, provider);

            // FALLBACK: If no OAuth integration is configured, use a simple deep link (No API needed)
            if (!integration) {
                const startTime = meetingStartTime || new Date();
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

                // Format dates for Google (YYYYMMDDTHHMMSSZ)
                const startStr = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const endStr = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                const title = encodeURIComponent(`AI/ML Club Meeting — ${roomName}`);
                const details = encodeURIComponent(`Meeting ID: ${meetingId}\nJoin at the AI/ML Club platform.`);

                if (provider === 'google') {
                    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}`, '_blank');
                }
                setSyncing(null);
                return;
            }

            // API SYNC: If user HAS an integration, use the background API sync
            const startTime = meetingStartTime || new Date();
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

            const res = await fetch(`/api/calendar/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    event: {
                        summary: `AI/ML Club Meeting — ${roomName}`,
                        description: `Meeting ID: ${meetingId}\nJoin at the AI/ML Club platform.`,
                        start: startTime.toISOString(),
                        end: endTime.toISOString(),
                    },
                }),
            });

            if (res.ok) {
                setSyncedTo((prev) => [...prev, provider]);
            }
        } catch (err) {
            console.error(`Failed to sync to ${provider}:`, err);
        } finally {
            setSyncing(null);
        }
    }, [user, meetingId, roomName, meetingStartTime]);

    const handleDownloadICS = () => {
        const startTime = meetingStartTime || new Date();
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const startStr = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endStr = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//AI/ML Club//CalendarSync//EN',
            'BEGIN:VEVENT',
            `DTSTART:${startStr}`,
            `DTEND:${endStr}`,
            `SUMMARY:AI/ML Club Meeting — ${roomName}`,
            `DESCRIPTION:Meeting ID: ${meetingId}\\nJoin at the AI/ML Club platform.`,
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `meeting-${meetingId}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return null;

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">Add to Calendar</div>
            </div>

            <div className="space-y-2">
                <button
                    onClick={() => handleSync('google')}
                    disabled={syncedTo.includes('google') || syncing === 'google'}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${syncedTo.includes('google')
                        ? 'bg-accent-500/10 border border-accent-500/20'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        } disabled:cursor-default`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                        📅 Google Calendar
                    </span>
                    {syncing === 'google' ? (
                        <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    ) : syncedTo.includes('google') ? (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-accent-400">✓ Added</span>
                    ) : (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Add</span>
                    )}
                </button>

                <button
                    onClick={handleDownloadICS}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white group-hover:text-accent-400">
                        💾 Apple / iCal (.ics)
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Download</span>
                </button>
            </div>

            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest text-center px-2">
                Adds meeting to your personal device calendar
            </p>
        </div >
    );
}
