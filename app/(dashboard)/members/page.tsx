'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { getMembers, inviteUserToClubAndTeam } from '@/lib/firebase/firestore';
import { User, TechFeedCategory } from '@/types';
import Link from 'next/link';
import { UserPlusIcon, XMarkIcon, PaperAirplaneIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const SKILLS: TechFeedCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Industry', 'Tools'];
const EXP_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function MembersPage() {
    const { user: currentUser } = useAuth();
    const { currentClub } = useClub();
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [skillFilter, setSkillFilter] = useState<string>('all');
    const [expFilter, setExpFilter] = useState<string>('all');

    // Invite Modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    useEffect(() => {
        if (!currentClub) return;

        const loadMembers = async () => {
            try {
                const data = await getMembers(currentClub.id);
                setMembers(data);
            } catch (error) {
                console.error('Failed to load members:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMembers();
    }, [currentClub]);

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.profile?.bio?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSkill = skillFilter === 'all' || m.profile?.expertise?.includes(skillFilter);
        const matchesExp = expFilter === 'all' || m.profile?.experienceLevel === expFilter;

        return matchesSearch && matchesSkill && matchesExp;
    });

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClub || !currentUser) return;

        setIsInviting(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            await inviteUserToClubAndTeam(
                currentUser.uid,
                currentUser.displayName,
                inviteEmail,
                currentClub.id
            );
            setInviteSuccess(true);
            setInviteEmail('');
            setTimeout(() => setIsInviteModalOpen(false), 2000);
        } catch (error: any) {
            console.error('Failed to invite:', error);
            setInviteError(error.message || 'Failed to send invitation.');
        } finally {
            setIsInviting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-gray-900 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80">Research Directory</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase leading-none">
                        Club Members
                    </h1>
                    <p className="text-gray-400 text-sm font-medium">
                        Search and verify collaborators within this intelligence node.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search identities..."
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-bold text-xs text-white placeholder:text-gray-500 outline-none focus:border-accent-500 focus:bg-white/10 w-full sm:w-64 transition-all"
                        />
                    </div>
                    {currentClub?.adminId === currentUser?.uid && (
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="btn-primary py-2 px-6 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                            Invite External
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Expertise</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSkillFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${skillFilter === 'all' ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                        >
                            All
                        </button>
                        {SKILLS.map(s => (
                            <button
                                key={s}
                                onClick={() => setSkillFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${skillFilter === s ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Level</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setExpFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${expFilter === 'all' ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                        >
                            All
                        </button>
                        {EXP_LEVELS.map(l => (
                            <button
                                key={l}
                                onClick={() => setExpFilter(l)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${expFilter === l ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-elevator-in">
                {filteredMembers.map(member => (
                    <div key={member.uid} className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl flex flex-col justify-between group hover:border-accent-500/30 hover:bg-white/[0.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-extrabold tracking-tight text-white group-hover:text-accent-400 transition-colors">
                                        {member.displayName}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${member.profile?.availabilityStatus === 'Available' ? 'bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : member.profile?.availabilityStatus === 'Busy' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-gray-500'}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{member.profile?.availabilityStatus || 'Status Unknown'}</span>
                                    </div>
                                </div>
                                <div className="px-2.5 py-1 bg-white/5 rounded-md border border-white/10">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{member.profile?.experienceLevel || 'Beginner'}</span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-400 font-medium line-clamp-3 min-h-[3rem] leading-relaxed">
                                {member.profile?.bio || "This researcher hasn't completed their synchronization protocol yet."}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {member.profile?.expertise?.map(exp => (
                                    <span key={exp} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold tracking-wider text-gray-400">
                                        {exp}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {member.profile?.externalLinks?.github && (
                                    <a href={`https://github.com/${member.profile.externalLinks.github}`} target="_blank" className="text-gray-500 hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                    </a>
                                )}
                                {member.profile?.externalLinks?.linkedin && (
                                    <a href={`https://linkedin.com/in/${member.profile.externalLinks.linkedin}`} target="_blank" className="text-gray-500 hover:text-blue-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                    </a>
                                )}
                            </div>
                            {member.uid !== currentUser?.uid && (
                                <Link
                                    href={`/chat?user=${member.uid}`}
                                    className="text-[11px] font-bold uppercase tracking-widest text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
                                >
                                    Message <span aria-hidden="true">&rarr;</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredMembers.length === 0 && (
                <div className="bg-black/40 backdrop-blur-xl p-20 rounded-3xl flex flex-col items-center text-center space-y-5 border border-dashed border-white/20">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="max-w-xs">
                        <h3 className="text-xl font-extrabold text-white leading-tight">No Identities Found</h3>
                        <p className="text-sm text-gray-400 mt-2">The search parameters yielded no results in the current cluster database.</p>
                    </div>
                    <button onClick={() => { setSearchQuery(''); setSkillFilter('all'); setExpFilter('all'); }} className="btn-primary py-2.5 px-6 text-xs font-bold tracking-widest uppercase">
                        Reset Filters
                    </button>
                </div>
            )}

            {/* Invitation Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-gray-900 border border-white/20 w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-500/20 rounded-full blur-3xl pointer-events-none"></div>

                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors z-10"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <div className="space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-extrabold tracking-tight text-white leading-none">Recruit Member</h2>
                                    <p className="text-xs font-bold uppercase tracking-widest text-accent-500 opacity-80">External Club Synchronization</p>
                                </div>

                                <form onSubmit={handleInvite} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Platform Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="researcher@example.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm font-medium text-white focus:border-accent-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                                        />
                                    </div>

                                    {inviteError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-400 uppercase tracking-widest">
                                            {inviteError}
                                        </div>
                                    )}

                                    {inviteSuccess && (
                                        <div className="p-3 bg-accent-500/10 border border-accent-500/20 rounded-lg text-[10px] font-bold text-accent-400 uppercase tracking-widest">
                                            Invitation signal transmitted successfully.
                                        </div>
                                    )}

                                    <button
                                        disabled={isInviting || inviteSuccess}
                                        type="submit"
                                        className="w-full btn-primary py-4 px-6 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isInviting ? 'Transmitting...' : 'Send Invitation Signal →'}
                                    </button>
                                </form>

                                <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <div className="flex gap-3">
                                        <InformationCircleIcon className="w-5 h-5 text-gray-500 shrink-0" />
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase">
                                            Only users already registered on the platform can be invited to a club.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
