'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { getMembers, getIdeas, createProject, createTask, inviteUserToClubAndTeam } from '@/lib/firebase/firestore';
import { User, TechFeedCategory, Idea, Project } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlusIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const SKILLS: TechFeedCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Industry', 'Tools'];

export default function TeamMatchPage() {
    const { user: currentUser } = useAuth();
    const { currentClub } = useClub();
    const router = useRouter();
    const [members, setMembers] = useState<User[]>([]);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [assemblingId, setAssemblingId] = useState<string | null>(null);
    const [results, setResults] = useState<{ member: User; score: number; reasons: string[] }[]>([]);

    // Selection state
    const [targetSkills, setTargetSkills] = useState<string[]>([]);
    const [prefExp, setPrefExp] = useState<'any' | 'same' | 'higher'>('any');
    const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');

    // Invite Modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    useEffect(() => {
        if (!currentClub) return;
        const loadInitialData = async () => {
            try {
                const [membersData, ideasResult] = await Promise.all([
                    getMembers(currentClub.id),
                    getIdeas(currentClub.id, 'open', undefined, 50)
                ]);
                setMembers(membersData.filter(m => m.uid !== currentUser?.uid));
                setIdeas(ideasResult.ideas);
            } catch (error) {
                console.error('Failed to load matching data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [currentClub, currentUser]);

    const handleToggleSkill = (skill: string) => {
        setTargetSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const runMatch = () => {
        setMatching(true);
        setResults([]);

        // Artificial delay for "AI" feel
        setTimeout(() => {
            const scored = members.map(m => {
                let score = 0;
                const reasons: string[] = [];

                // Availability bonus
                if (m.profile?.availabilityStatus === 'Available') {
                    score += 30;
                    reasons.push('High Availability');
                } else if (m.profile?.availabilityStatus === 'Looking for Project') {
                    score += 50;
                    reasons.push('Actively seeking project');
                }

                // Skill Matching
                const sharedSkills = m.profile?.expertise?.filter(s => targetSkills.includes(s)) || [];
                if (sharedSkills.length > 0) {
                    score += sharedSkills.length * 20;
                    reasons.push(`Matches ${sharedSkills.length} required skills`);
                }

                // Experience alignment
                const myExp = currentUser?.profile?.experienceLevel || 'Beginner';
                const theirExp = m.profile?.experienceLevel || 'Beginner';

                if (prefExp === 'same' && myExp === theirExp) {
                    score += 25;
                    reasons.push('Aligned experience level');
                } else if (prefExp === 'higher' && (
                    (myExp === 'Beginner' && (theirExp === 'Intermediate' || theirExp === 'Advanced')) ||
                    (myExp === 'Intermediate' && theirExp === 'Advanced')
                )) {
                    score += 40;
                    reasons.push('Senior mentorship potential');
                }

                return { member: m, score, reasons };
            })
                .filter(r => r.score > 20)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            setResults(scored);
            setMatching(false);
        }, 1500);
    };

    const handleAssembleTeam = async (member: User) => {
        if (!selectedIdeaId || !currentClub || !currentUser) return;

        setAssemblingId(member.uid);
        try {
            const idea = ideas.find(i => i.id === selectedIdeaId);
            const projectId = await createProject({
                clubId: currentClub.id,
                name: idea?.title || "New Collaboration",
                description: idea?.problemStatement || "Team formed via Smart Matching.",
                status: 'planning',
                leadId: currentUser.uid,
                members: [currentUser.uid, member.uid],
                startDate: new Date(),
            });

            router.push(`/projects/${projectId}`);
        } catch (error) {
            console.error('Failed to assemble team:', error);
            alert('Failed to initialize project team.');
        } finally {
            setAssemblingId(null);
        }
    };

    const handleInviteExternal = async (e: React.FormEvent) => {
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
        <div className="max-w-full space-y-2 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 relative">
                    <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-accent-500/30 text-accent-400 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <span className="text-xl leading-none">✨</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Neural Matchmaker v2.1</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
                        Internal <span className="text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Matching</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-medium relative z-10 mt-2">
                        Analyze skill complementarity within the club workspace.
                    </p>
                </div>
                {currentClub?.adminId === currentUser?.uid && (
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="btn-primary py-3.5 px-6 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all relative z-10"
                    >
                        <UserPlusIcon className="w-5 h-5" />
                        Invite External Researcher
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-auto w-full">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[60px] rounded-full pointer-events-none" />

                        <div className="space-y-4 relative z-10">
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Target Expertise</h3>
                            <div className="flex flex-wrap gap-2.5">
                                {SKILLS.map(s => {
                                    const active = targetSkills.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => handleToggleSkill(s)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border transition-all ${active ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Research Objective</h3>
                            <select
                                value={selectedIdeaId}
                                onChange={(e) => setSelectedIdeaId(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 text-white transition-all appearance-none [&>option]:bg-gray-900 shadow-inner"
                            >
                                <option value="">Select an Idea...</option>
                                {ideas.map(idea => (
                                    <option key={idea.id} value={idea.id}>{idea.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Exp. Alignment</h3>
                            <div className="space-y-3">
                                {[
                                    { id: 'any', label: 'Balanced Mix' },
                                    { id: 'same', label: 'Peer Collaboration' },
                                    { id: 'higher', label: 'Expert Guidance' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPrefExp(opt.id as any)}
                                        className={`w-full px-5 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.15em] text-left border transition-all ${prefExp === opt.id ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={runMatch}
                            disabled={matching || targetSkills.length === 0}
                            className="w-full btn-primary rounded-2xl py-4 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:grayscale disabled:opacity-50 relative z-10 active:scale-[0.98] transition-all"
                        >
                            {matching ? 'Analyzing Cluster...' : 'Initiate Neural Match'}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-2 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {matching ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                            >
                                <div className="relative">
                                    <div className="w-24 h-24 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
                                </div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-500 animate-pulse">Scanning Synapses...</p>
                            </motion.div>
                        ) : results.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Optimization Results ({results.length})</h2>
                                    <button onClick={() => setResults([])} className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-400 transition-colors">Reset</button>
                                </div>
                                {results.map((res, i) => (
                                    <div key={res.member.uid} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group hover:border-accent-500/30 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/0 via-accent-500/0 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex gap-5">
                                                <div className="w-16 h-16 rounded-[1.25rem] bg-white/5 flex items-center justify-center text-3xl border border-white/10 shadow-inner group-hover:border-accent-500/30 transition-colors">
                                                    {['🧑‍🔬', '👨‍💻', '👩‍🚀', '🕵️', '🧙'][i % 5]}
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-extrabold uppercase tracking-tight text-white group-hover:text-accent-400 transition-colors">{res.member.displayName}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {res.reasons.map((reason, idx) => (
                                                            <span key={idx} className="px-2.5 py-1 bg-accent-500/10 text-[9px] font-bold uppercase tracking-widest text-accent-400 border border-accent-500/20 rounded-md">
                                                                {reason}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-4xl font-extrabold text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] leading-none">{res.score}%</div>
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-2">Match Factor</div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6 relative z-10">
                                            <div className="flex gap-2">
                                                {res.member.profile?.expertise?.slice(0, 3).map(exp => (
                                                    <span key={exp} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-300 shadow-sm">
                                                        {exp}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-3">
                                                <Link
                                                    href={`/chat?user=${res.member.uid}`}
                                                    className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                >
                                                    Message
                                                </Link>
                                                <button
                                                    onClick={() => handleAssembleTeam(res.member)}
                                                    disabled={!selectedIdeaId || assemblingId !== null}
                                                    className={`btn-primary px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] ${!selectedIdeaId ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95'}`}
                                                >
                                                    {assemblingId === res.member.uid ? 'Assembling...' : 'Assemble Team →'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full bg-black/40 backdrop-blur-xl border justify-center border-dashed border-white/20 rounded-[3rem] flex flex-col items-center p-20 text-center space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                            >
                                <div className="text-6xl filter grayscale opacity-20">🤖</div>
                                <div className="space-y-3">
                                    <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-300">Engine Standby</h3>
                                    <p className="text-[12px] text-gray-500 font-medium max-w-[240px] leading-relaxed mx-auto">Configure your desired research metrics to begin matching.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Invitation Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-black/90 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />

                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="absolute right-6 top-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all z-10"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            <div className="space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white leading-none">Recruit Researcher</h2>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent-500">External Neural Linkage</p>
                                </div>

                                <form onSubmit={handleInviteExternal} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Researcher Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="expert@lab.ai"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner placeholder:text-gray-600 transition-all"
                                        />
                                    </div>

                                    {inviteError && (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                                            {inviteError}
                                        </div>
                                    )}

                                    {inviteSuccess && (
                                        <div className="p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl text-[10px] font-bold text-accent-400 uppercase tracking-widest">
                                            Invitation signal transmitted.
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            disabled={isInviting || inviteSuccess}
                                            type="submit"
                                            className="w-full btn-primary py-4 px-6 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:grayscale active:scale-[0.98] transition-all"
                                        >
                                            {isInviting ? 'Transmitting...' : 'Send Invitation Signal →'}
                                        </button>
                                    </div>
                                </form>

                                <div className="p-5 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                            <InformationCircleIcon className="w-4 h-4 text-accent-500" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase pt-1">
                                            Add researchers to the club first to enable match analysis and team assembly.
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
