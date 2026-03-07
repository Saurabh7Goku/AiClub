'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToNotifications } from '@/lib/firebase/firestore';
import { Notification } from '@/types';
import {
    HomeIcon,
    UsersIcon,
    BeakerIcon,
    ChatBubbleLeftRightIcon,
    VideoCameraIcon,
    SparklesIcon,
    Square3Stack3DIcon,
    DocumentDuplicateIcon,
    CalendarIcon,
    BookOpenIcon,
    ChartBarIcon,
    ShieldCheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    BellIcon,
    BuildingOffice2Icon,
    DocumentTextIcon,
    TrophyIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
    name: string;
    path: string;
    icon: any;
    category?: string;
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon, category: 'CLUB WORKSPACE' },
    { name: 'Clubs', path: '/clubs', icon: BuildingOffice2Icon, category: 'CLUB WORKSPACE' },
    { name: 'Members', path: '/members', icon: UsersIcon, category: 'CLUB WORKSPACE' },
    { name: 'Team Match', path: '/team-match', icon: SparklesIcon, category: 'CLUB WORKSPACE' },
    { name: 'Notifications', path: '/notifications', icon: BellIcon, category: 'CLUB WORKSPACE' },
    { name: 'Tech-News', path: '/tech-feed', icon: ChartBarIcon, category: 'CLUB WORKSPACE' },
    { name: 'Leaderboard', path: '/leaderboard', icon: TrophyIcon, category: 'CLUB WORKSPACE' },

    { name: 'Research', path: '/ideas', icon: BeakerIcon, category: 'RESEARCH' },
    { name: 'Cohorts', path: '/meetings', icon: VideoCameraIcon, category: 'RESEARCH' },
    { name: 'Meeting Notes', path: '/meetings/notes', icon: DocumentTextIcon, category: 'RESEARCH' },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftRightIcon, category: 'RESEARCH' },

    { name: 'Projects', path: '/projects', icon: Square3Stack3DIcon, category: 'COLLABORATE' },
    { name: 'Boards', path: '/boards', icon: DocumentDuplicateIcon, category: 'COLLABORATE' },

    { name: 'Wiki', path: '/wiki', icon: BookOpenIcon, category: 'KNOWLEDGE' },
    { name: 'Events', path: '/calendar', icon: CalendarIcon, category: 'KNOWLEDGE' },
];

interface Props {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (value: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: Props) {
    const pathname = usePathname();
    const { user, isLeader, isAdmin } = useAuth();
    const { currentClub } = useClub();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
            const count = notifs.filter(n => !n.read).length;
            setUnreadCount(count);
        });
        return () => unsubscribe();
    }, [user]);

    const groupedItems = NAV_ITEMS.reduce((acc, item) => {
        const cat = item.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, NavItem[]>);

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isCollapsed ? 88 : 256,
                x: typeof window !== 'undefined' && window.innerWidth < 1024
                    ? (isMobileOpen ? 0 : -256)
                    : 0
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-950 border-r border-white/10 flex flex-col z-50 shadow-2xl transition-all duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            {/* Logo Area */}
            <div className={`p-6 border-b border-white/5 bg-transparent flex items-center relative overflow-hidden ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <div className="shrink-0 w-10 h-10 bg-background border border-white/10 rounded-xl flex items-center justify-center relative group z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-accent-500/10 group-hover:bg-accent-500/20 transition-colors duration-500"></div>
                    <span className="text-accent-500 font-bold text-lg tracking-tighter relative z-10">AI</span>
                </div>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <span className="font-extrabold text-base leading-none tracking-tight uppercase text-[rgb(var(--foreground-rgb))]">Intelligence</span>
                        <span className="text-[10px] font-bold text-accent-600 dark:text-accent-500 uppercase tracking-[0.2em] leading-none mt-1">Laboratory</span>
                    </motion.div>
                )}

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-0 top-1/2 -translate-y-1/2 bg-background border-l border-y border-white/10 rounded-l-lg p-1.5 hover:bg-white/[0.05] transition-colors z-20"
                >
                    {isCollapsed ? (
                        <ChevronRightIcon className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                    ) : (
                        <ChevronLeftIcon className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                    )}
                </button>
            </div>

            {/* Club Context Display (Mini) */}
            <div className="px-6 py-4 bg-white/[0.01] border-b border-dashed border-white/10">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest truncate">
                        {currentClub?.name || 'Global Node'}
                    </span>
                </div>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} className="space-y-1.5">
                        <h4 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">
                            {category}
                        </h4>
                        {items.map((item) => {
                            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                            const Icon = item.icon;
                            const hasBadge = item.path === '/notifications' && unreadCount > 0;

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center px-3 py-2.5 rounded-xl transition-all border border-transparent group relative ${isCollapsed ? 'justify-center' : 'space-x-3'} ${isActive
                                        ? 'bg-accent-500/10 text-accent-600 dark:text-accent-500 border-accent-500/20 shadow-sm'
                                        : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <div className="relative">
                                        <Icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? 'text-accent-500' : 'opacity-60 group-hover:opacity-100'}`} />
                                        {hasBadge && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500 border border-[rgb(var(--background-rgb))]"></span>
                                            </span>
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <span className={`text-[11px] uppercase tracking-widest font-semibold transition-colors ${isActive ? 'text-accent-600 dark:text-accent-500' : 'text-gray-500 group-hover:text-[rgb(var(--foreground-rgb))]'}`}>
                                            {item.name}
                                        </span>
                                    )}

                                    {/* Tooltip for collapsed state */}
                                    {isCollapsed && (
                                        <div className="absolute left-16 bg-card text-[rgb(var(--foreground-rgb))] text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all z-50 whitespace-nowrap border border-white/5 shadow-xl">
                                            {item.name}
                                            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-card rotate-45 border-l border-b border-white/5" />
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}

                {(isLeader || isAdmin) && (
                    <div className="space-y-1.5 pt-4">
                        <h4 className="px-3 text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-2">
                            Admin
                        </h4>
                        <Link
                            href="/leader"
                            className={`flex items-center px-3 py-2.5 rounded-xl transition-all border border-transparent group relative ${isCollapsed ? 'justify-center' : 'space-x-3'} ${pathname.startsWith('/leader')
                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-500 border-primary-500/20'
                                : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                                }`}
                        >
                            <ShieldCheckIcon className={`w-5 h-5 shrink-0 transition-all duration-300 ${pathname.startsWith('/leader') ? 'text-primary-500' : 'opacity-50 group-hover:opacity-100'}`} />
                            {!isCollapsed && (
                                <span className={`text-[11px] uppercase tracking-widest font-semibold transition-colors ${pathname.startsWith('/leader') ? 'text-primary-500' : 'opacity-60 group-hover:opacity-100'}`}>
                                    Management
                                </span>
                            )}
                        </Link>
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className={`flex items-center px-3 py-2.5 rounded-xl transition-all border border-transparent group relative ${isCollapsed ? 'justify-center' : 'space-x-3'} ${pathname.startsWith('/admin')
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20'
                                    : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                                    }`}
                            >
                                <UsersIcon className={`w-5 h-5 shrink-0 transition-all duration-300 ${pathname.startsWith('/admin') ? 'text-amber-500' : 'opacity-50 group-hover:opacity-100'}`} />
                                {!isCollapsed && (
                                    <span className={`text-[11px] uppercase tracking-widest font-semibold transition-colors ${pathname.startsWith('/admin') ? 'text-amber-500' : 'opacity-60 group-hover:opacity-100'}`}>
                                        Roles
                                    </span>
                                )}
                            </Link>
                        )}
                        {(isLeader || isAdmin) && (
                            <Link
                                href="/admin/integrations"
                                className={`flex items-center px-3 py-2.5 rounded-xl transition-all border border-transparent group relative ${isCollapsed ? 'justify-center' : 'space-x-3'} ${pathname.startsWith('/admin/integrations')
                                    ? 'bg-accent-500/10 text-accent-600 dark:text-accent-500 border-accent-500/20'
                                    : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                                    }`}
                            >
                                <Cog6ToothIcon className={`w-5 h-5 shrink-0 transition-all duration-300 ${pathname.startsWith('/admin/integrations') ? 'text-accent-500' : 'opacity-50 group-hover:opacity-100'}`} />
                                {!isCollapsed && (
                                    <span className={`text-[11px] uppercase tracking-widest font-semibold transition-colors ${pathname.startsWith('/admin/integrations') ? 'text-accent-500' : 'opacity-60 group-hover:opacity-100'}`}>
                                        Integrations
                                    </span>
                                )}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Footer / Credits */}
            <div className="p-3 border-t border-white/10 font-mono text-[9px] text-gray-500 uppercase tracking-widest text-center mt-auto bg-black/10 dark:bg-white/[0.02]">
                &copy; SaurabhSingh
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--foreground-rgb), 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--foreground-rgb), 0.2);
                }
            `}</style>
        </motion.aside>
    );
}
