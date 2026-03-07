'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { subscribeToNotifications, markNotificationAsRead, acceptInvitation } from '@/lib/firebase/firestore';
import { Notification } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BellIcon,
    CheckCircleIcon,
    XMarkIcon,
    UserGroupIcon,
    SparklesIcon,
    InformationCircleIcon,
    CalendarIcon,
    LightBulbIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setLoading(false);
            setError(null);
        });

        // Timeout to handle potential silent failures (like missing indices or rules)
        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false);
                setError("Unable to load notifications. Please check your connection or permissions.");
            }
        }, 10000);

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    }, [user, loading]);

    const handleAccept = async (notif: Notification) => {
        if (!user || !notif.clubId) return;
        setProcessingId(notif.id);
        try {
            await acceptInvitation(user.uid, notif.id, notif.clubId, notif.teamId);
        } catch (error) {
            console.error('Failed to accept invitation:', error);
            alert('Failed to accept invitation. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (id: string) => {
        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const getNotificationLink = (notif: Notification) => {
        if (!notif.metadata) return null;
        
        switch (notif.type) {
            case 'new_idea':
                return notif.metadata.ideaId ? `/ideas/${notif.metadata.ideaId}` : '/ideas';
            case 'new_wiki':
                return notif.metadata.articleId ? `/wiki/${notif.metadata.articleId}` : '/wiki';
            case 'new_event':
                return '/events';
            case 'team_invite':
                return '/team-match';
            default:
                return null;
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'club_invite': return <UserGroupIcon className="w-6 h-6 text-primary-500" />;
            case 'team_invite': return <SparklesIcon className="w-6 h-6 text-amber-500" />;
            case 'new_event': return <CalendarIcon className="w-6 h-6 text-blue-500" />;
            case 'new_wiki': return <BookOpenIcon className="w-6 h-6 text-purple-500" />;
            case 'new_idea': return <LightBulbIcon className="w-6 h-6 text-amber-500" />;
            default: return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 animate-pulse">Loading Notifications...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 max-w-md mx-auto text-center animate-elevator-in">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[2rem] shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <XMarkIcon className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-extrabold uppercase tracking-tight text-white">Connection Error</h3>
                    <p className="text-xs font-medium text-gray-400 leading-relaxed max-w-sm">{error}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary py-3 px-8 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow"
                >
                    Retry
                </button>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-full space-y-8 pb-20 animate-elevator-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 text-white rounded-md shadow-inner">
                            <BellIcon className="w-3.5 h-3.5 text-accent-500" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-300">Notifications</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase leading-none">
                        Notifications
                    </h1>
                    <p className="text-gray-400 text-sm font-medium mt-3">
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
                            : 'All caught up! No new notifications.'}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {notifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-black/40 backdrop-blur-xl border border-white/10 border-dashed rounded-[2rem] py-20 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <BellIcon className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">No Notifications</p>
                        </motion.div>
                    ) : (
                        notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`p-6 rounded-[2rem] border flex items-start gap-6 transition-all relative overflow-hidden ${notif.read ? 'bg-black/20 border-white/5 opacity-60 backdrop-blur-sm' : 'bg-black/40 border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-accent-500/30'}`}
                            >
                                {!notif.read && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[40px] rounded-full pointer-events-none"></div>
                                )}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border relative z-10 ${notif.read ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/20'}`}>
                                    {getIcon(notif.type)}
                                </div>

                                <div className="flex-1 space-y-1 relative z-10 min-w-0">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <h3 className={`font-extrabold uppercase tracking-tight truncate ${notif.read ? 'text-gray-400' : 'text-white'}`}>{notif.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
                                                {new Date(notif.createdAt).toLocaleDateString()}
                                            </span>
                                            {notif.type !== 'club_invite' && getNotificationLink(notif) && !notif.read && (
                                                <Link
                                                    href={getNotificationLink(notif)!}
                                                    onClick={() => handleDismiss(notif.id)}
                                                    className="px-3 py-1 bg-accent-500/10 border border-accent-500/20 text-accent-400 text-[9px] font-bold uppercase tracking-widest rounded transition-all hover:bg-accent-500/20 hover:text-white"
                                                >
                                                    View
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-sm font-medium leading-relaxed ${notif.read ? 'text-gray-500' : 'text-gray-400'}`}>{notif.message}</p>

                                    {!notif.read && notif.type === 'club_invite' && (
                                        <div className="flex flex-wrap gap-3 mt-6">
                                            <button
                                                onClick={() => handleAccept(notif)}
                                                disabled={processingId === notif.id}
                                                className="btn-primary py-2.5 px-6 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow"
                                            >
                                                {processingId === notif.id ? 'Processing...' : 'Accept Invite'}
                                            </button>
                                            <button
                                                onClick={() => handleDismiss(notif.id)}
                                                className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {notif.read && (
                                        <div className="mt-3 text-[10px] font-bold text-accent-500 uppercase tracking-widest flex items-center gap-1.5 bg-accent-500/10 inline-flex px-2 py-1 rounded border border-accent-500/20">
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            Processed
                                        </div>
                                    )}
                                </div>

                                {!notif.read && notif.type !== 'club_invite' && (
                                    <button
                                        onClick={() => handleDismiss(notif.id)}
                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 relative z-10"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
