'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getUserCalendarIntegrations,
    deleteCalendarIntegration,
} from '@/lib/firebase/firestore';
import { CalendarIntegration, CalendarProvider } from '@/types';

export default function CalendarSettings() {
    const { user } = useAuth();
    const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<CalendarProvider | null>(null);

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

    const handleConnect = async (provider: CalendarProvider) => {
        if (!user) return;
        setConnecting(provider);
        try {
            const res = await fetch(`/api/calendar/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            });
            const json = await res.json();
            if (json.success && json.data?.authUrl) {
                window.location.href = json.data.authUrl;
            }
        } catch (err) {
            console.error(`Failed to connect ${provider}:`, err);
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (provider: CalendarProvider) => {
        if (!user) return;
        try {
            await deleteCalendarIntegration(user.uid, provider);
            setIntegrations((prev) => prev.filter((i) => i.provider !== provider));
        } catch (err) {
            console.error(`Failed to disconnect ${provider}:`, err);
        }
    };

    const isConnected = (provider: CalendarProvider) =>
        integrations.some((i) => i.provider === provider);

    const getIntegration = (provider: CalendarProvider) =>
        integrations.find((i) => i.provider === provider);

    if (loading) {
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const PROVIDERS: Array<{
        id: CalendarProvider;
        name: string;
        icon: string;
        color: string;
        bgColor: string;
        borderColor: string;
    }> = [
            {
                id: 'google',
                name: 'Google Calendar',
                icon: 'G',
                color: 'text-[#4285F4]',
                bgColor: 'bg-[#4285F4]/20',
                borderColor: 'border-[#4285F4]/30',
            },
        ];

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <div className="pb-4 border-b border-white/10">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">Calendar Integration</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Sync meetings with your calendar
                </p>
            </div>

            <div className="space-y-4">
                {PROVIDERS.map((provider) => {
                    const connected = isConnected(provider.id);
                    const integration = getIntegration(provider.id);

                    return (
                        <div
                            key={provider.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${provider.bgColor} ${provider.borderColor} border flex items-center justify-center`}>
                                    <span className={`text-sm font-bold ${provider.color}`}>{provider.icon}</span>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white uppercase tracking-widest">{provider.name}</div>
                                    {connected && integration && (
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                            Connected • {integration.calendarId}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {connected ? (
                                <button
                                    onClick={() => handleDisconnect(provider.id)}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnect(provider.id)}
                                    disabled={connecting === provider.id}
                                    className="px-4 py-2 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-[10px] font-bold uppercase tracking-widest hover:bg-accent-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {connecting === provider.id ? (
                                        <span className="w-3 h-3 border-2 border-accent-400/20 border-t-accent-400 rounded-full animate-spin"></span>
                                    ) : null}
                                    Connect
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
