'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { getIntegrationSettings, updateIntegrationSettings } from '@/lib/firebase/firestore';
import { IntegrationNotificationConfig } from '@/types';

const DEFAULT_NOTIFICATIONS: IntegrationNotificationConfig = {
    meetingStarted: true,
    meetingEnded: true,
    newIdea: true,
    ideaApproved: true,
    ideaRejected: false,
};

export default function IntegrationSettings() {
    const { user } = useAuth();
    const { currentClub } = useClub();

    const [teamsUrl, setTeamsUrl] = useState('');
    const [slackUrl, setSlackUrl] = useState('');
    const [notifications, setNotifications] = useState<IntegrationNotificationConfig>(DEFAULT_NOTIFICATIONS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<'teams' | 'slack' | null>(null);
    const [testResult, setTestResult] = useState<{ platform: string; success: boolean } | null>(null);

    useEffect(() => {
        if (!currentClub) return;
        const load = async () => {
            setLoading(true);
            const settings = await getIntegrationSettings(currentClub.id);
            if (settings) {
                setTeamsUrl(settings.teamsWebhookUrl || '');
                setSlackUrl(settings.slackWebhookUrl || '');
                setNotifications(settings.notifications || DEFAULT_NOTIFICATIONS);
            }
            setLoading(false);
        };
        load();
    }, [currentClub]);

    const handleSave = async () => {
        if (!currentClub || !user) return;
        setSaving(true);
        try {
            await updateIntegrationSettings(
                currentClub.id,
                {
                    teamsWebhookUrl: teamsUrl || undefined,
                    slackWebhookUrl: slackUrl || undefined,
                    notifications,
                },
                user.uid
            );
        } catch (err) {
            console.error('Failed to save integration settings:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (platform: 'teams' | 'slack') => {
        const url = platform === 'teams' ? teamsUrl : slackUrl;
        if (!url || !currentClub) return;

        setTesting(platform);
        setTestResult(null);
        try {
            const res = await fetch('/api/integrations/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': process.env.NEXT_PUBLIC_WEBHOOK_AUTH_TOKEN || '',
                },
                body: JSON.stringify({
                    clubId: currentClub.id,
                    clubName: currentClub.name,
                    eventType: 'meeting_started',
                    roomName: 'Test Room',
                    startedBy: user?.displayName || 'System',
                    meetingUrl: window.location.origin + '/meetings',
                    teamsWebhookUrl: platform === 'teams' ? url : undefined,
                    slackWebhookUrl: platform === 'slack' ? url : undefined,
                }),
            });
            const json = await res.json();
            setTestResult({
                platform,
                success: json.success && (platform === 'teams' ? json.data?.teams : json.data?.slack),
            });
        } catch {
            setTestResult({ platform, success: false });
        } finally {
            setTesting(null);
        }
    };

    const toggleNotification = (key: keyof IntegrationNotificationConfig) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-20 flex flex-col items-center justify-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-10 h-10 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Integrations...</p>
            </div>
        );
    }

    const NOTIFICATION_LABELS: Record<keyof IntegrationNotificationConfig, string> = {
        meetingStarted: 'Meeting Started',
        meetingEnded: 'Meeting Ended',
        newIdea: 'New Idea Submitted',
        ideaApproved: 'Idea Approved',
        ideaRejected: 'Idea Rejected',
    };

    return (
        <div className="space-y-8">
            {/* Teams Webhook */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5B5FC7]/20 border border-[#5B5FC7]/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#5B5FC7]">T</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">Microsoft Teams</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Incoming Webhook</p>
                        </div>
                    </div>
                    {teamsUrl && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30">
                            Connected
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Webhook URL</label>
                    <input
                        type="url"
                        value={teamsUrl}
                        onChange={(e) => setTeamsUrl(e.target.value)}
                        placeholder="https://outlook.office.com/webhook/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors font-mono"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleTest('teams')}
                        disabled={!teamsUrl || testing === 'teams'}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                        {testing === 'teams' ? (
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        Send Test
                    </button>
                    {testResult?.platform === 'teams' && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest self-center ${testResult.success ? 'text-accent-400' : 'text-red-400'}`}>
                            {testResult.success ? '✓  Delivered' : '✗  Failed'}
                        </span>
                    )}
                </div>
            </div>

            {/* Slack Webhook */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E01E5A]/20 border border-[#E01E5A]/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#E01E5A]">S</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">Slack</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Incoming Webhook</p>
                        </div>
                    </div>
                    {slackUrl && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30">
                            Connected
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Webhook URL</label>
                    <input
                        type="url"
                        value={slackUrl}
                        onChange={(e) => setSlackUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors font-mono"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleTest('slack')}
                        disabled={!slackUrl || testing === 'slack'}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                        {testing === 'slack' ? (
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        Send Test
                    </button>
                    {testResult?.platform === 'slack' && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest self-center ${testResult.success ? 'text-accent-400' : 'text-red-400'}`}>
                            {testResult.success ? '✓  Delivered' : '✗  Failed'}
                        </span>
                    )}
                </div>
            </div>

            {/* Notification Toggles */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="pb-4 border-b border-white/10">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">Notification Events</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Choose which events trigger webhook notifications
                    </p>
                </div>

                <div className="space-y-3">
                    {(Object.keys(NOTIFICATION_LABELS) as Array<keyof IntegrationNotificationConfig>).map((key) => (
                        <button
                            key={key}
                            onClick={() => toggleNotification(key)}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors"
                        >
                            <span className="text-xs font-bold text-white uppercase tracking-widest">{NOTIFICATION_LABELS[key]}</span>
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${notifications[key] ? 'bg-accent-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifications[key] ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary py-4 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {saving ? (
                    <>
                        <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                        Saving...
                    </>
                ) : (
                    'Save Integration Settings'
                )}
            </button>
        </div>
    );
}
