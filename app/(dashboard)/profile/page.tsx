'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getUser, updateUser } from '@/lib/firebase/firestore';
import { TechFeedCategory } from '@/types';

const CATEGORIES: TechFeedCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Industry', 'Tools'];

export default function ProfilePage() {
    const { user: authUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [expertise, setExpertise] = useState<string[]>([]);
    const [experienceLevel, setExperienceLevel] = useState('Beginner');
    const [availabilityStatus, setAvailabilityStatus] = useState('Available');
    const [projects, setProjects] = useState<{ name: string; link: string }[]>([]);
    const [github, setGithub] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [portfolio, setPortfolio] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLink, setNewProjectLink] = useState('');
    const [digestSubscription, setDigestSubscription] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!authUser) return;

        const loadProfile = async () => {
            try {
                const userData = await getUser(authUser.uid);
                if (userData) {
                    setDisplayName(userData.displayName || '');
                    setBio(userData.profile?.bio || '');
                    setExpertise(userData.profile?.expertise || []);
                    setExperienceLevel(userData.profile?.experienceLevel || 'Beginner');
                    setAvailabilityStatus(userData.profile?.availabilityStatus || 'Available');
                    setProjects(userData.profile?.projectsWorkedOn || []);
                    setGithub(userData.profile?.externalLinks?.github || '');
                    setLinkedin(userData.profile?.externalLinks?.linkedin || '');
                    setPortfolio(userData.profile?.externalLinks?.portfolio || '');
                    setDigestSubscription(userData.digestSubscription || false);
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [authUser]);

    const handleToggleExpertise = (cat: string) => {
        setExpertise(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser) return;

        setSaving(true);
        setMessage(null);

        try {
            await updateUser(authUser.uid, {
                displayName,
                profile: {
                    ...authUser.profile,
                    bio,
                    expertise,
                    experienceLevel,
                    availabilityStatus,
                    projectsWorkedOn: projects,
                    externalLinks: {
                        github: github || '',
                        linkedin: linkedin || '',
                        portfolio: portfolio || ''
                    }
                },
                digestSubscription
            } as any);
            setMessage({ type: 'success', text: 'Intelligence profile updated successfully.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: 'Failed to update protocol. System override required.' });
        } finally {
            setSaving(false);
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
        <div className="max-w-full space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 relative">
                    <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">Operator Identity</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
                        Profile Settings
                    </h1>
                    <p className="text-gray-400 text-sm font-medium relative z-10 mt-2">
                        Manage your intelligence parameters and research expertise.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-elevator-in">
                {/* Basic Info - Spans 2 rows on desktop */}
                <div className="lg:col-span-12 xl:col-span-4 xl:row-span-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                    <div className="space-y-2 relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
                                <span className="text-accent-500">👤</span> Identity
                            </h2>
                            <p className="text-xs font-medium text-gray-400 mt-1">Core public-facing details.</p>
                        </div>
                    </div>

                    <div className="space-y-3 relative z-10">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">Public Codename</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all outline-none shadow-inner"
                            placeholder="Enter display name..."
                            required
                        />
                    </div>

                    <div className="space-y-3 relative z-10 flex-1 flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">Professional Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all min-h-[160px] outline-none shadow-inner custom-scrollbar"
                            placeholder="Describe your research focus..."
                        />
                    </div>
                </div>

                {/* Expertise Selection */}
                <div className="lg:col-span-12 xl:col-span-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                    <div className="space-y-2 relative z-10 mb-6">
                        <h2 className="text-xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
                            <span className="text-accent-500">🧠</span> Research Expertise
                        </h2>
                        <p className="text-xs font-medium text-gray-400">Select areas of focus to tailor your intelligence feed and collaboration matching.</p>
                    </div>

                    <div className="flex flex-wrap gap-3 relative z-10">
                        {CATEGORIES.map(cat => {
                            const active = expertise.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleToggleExpertise(cat)}
                                    className={`px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all border ${active
                                        ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105'
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white hover:scale-[1.02] active:scale-95'
                                        }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Parameters & Availability */}
                <div className="md:col-span-6 lg:col-span-6 xl:col-span-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                    <h2 className="text-xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2 relative z-10">
                        <span className="text-accent-500">⚡</span> Status Parameters
                    </h2>

                    <div className="flex flex-col gap-6 relative z-10 flex-1 justify-center">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">Experience Level</label>
                            <div className="relative">
                                <select
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white appearance-none outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all shadow-inner [&>option]:bg-gray-900 cursor-pointer"
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                                    ▼
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">Availability</label>
                            <div className="relative">
                                <select
                                    value={availabilityStatus}
                                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white appearance-none outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all shadow-inner [&>option]:bg-gray-900 cursor-pointer"
                                >
                                    <option value="Available">Available</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Looking for Project">Looking for Project</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* External Nodes */}
                <div className="md:col-span-6 lg:col-span-6 xl:col-span-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                    <h2 className="text-xl font-extrabold uppercase tracking-tight text-white relative z-10 flex items-center gap-2">
                        <span className="text-accent-500">�</span> External Nodes
                    </h2>

                    <div className="flex flex-col gap-5 relative z-10 flex-1 justify-center">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">GitHub</label>
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/50 transition-all overflow-hidden h-14">
                                <span className="px-4 py-4 bg-black/40 text-gray-400 border-r border-white/10 font-mono text-xs flex items-center h-full">github.com/</span>
                                <input
                                    type="text"
                                    value={github}
                                    onChange={(e) => setGithub(e.target.value)}
                                    className="w-full h-full bg-transparent px-3 font-bold text-sm text-white outline-none placeholder:text-gray-600"
                                    placeholder="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">LinkedIn</label>
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/50 transition-all overflow-hidden h-14">
                                <span className="px-4 py-4 bg-black/40 text-gray-400 border-r border-white/10 font-mono text-xs flex items-center h-full">in/</span>
                                <input
                                    type="text"
                                    value={linkedin}
                                    onChange={(e) => setLinkedin(e.target.value)}
                                    className="w-full h-full bg-transparent px-3 font-bold text-sm text-white outline-none placeholder:text-gray-600"
                                    placeholder="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-1">Portfolio</label>
                            <input
                                type="url"
                                value={portfolio}
                                onChange={(e) => setPortfolio(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 font-bold text-sm text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all outline-none placeholder:text-gray-600"
                                placeholder="https://your-website.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Projects */}
                <div className="lg:col-span-12 xl:col-span-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                    <h2 className="text-xl font-extrabold uppercase tracking-tight text-white border-b border-white/10 pb-4 relative z-10 w-full flex items-center gap-2">
                        <span className="text-accent-500">📁</span> Research Portfolio
                    </h2>

                    <div className="space-y-4 relative z-10 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent-500/30 hover:bg-white/10 transition-all group/item">
                                    <div className="overflow-hidden pr-2">
                                        <p className="font-extrabold text-white text-sm truncate">{p.name}</p>
                                        <a href={p.link} target="_blank" className="text-xs text-accent-500 font-bold hover:text-accent-400 transition-colors mt-0.5 block truncate">{p.link}</a>
                                    </div>
                                    <button type="button" onClick={() => setProjects(projects.filter((_, idx) => idx !== i))} className="shrink-0 p-2.5 text-rose-500/80 hover:text-rose-400 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500/10 rounded-xl transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col xl:flex-row gap-4 p-4 border border-dashed border-white/20 rounded-2xl bg-black/20 focus-within:border-accent-500/50 transition-colors items-center mt-6">
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Project Title"
                                className="w-full xl:w-[35%] bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all placeholder:text-gray-600 min-w-0"
                            />
                            <div className="flex items-center gap-3 w-full xl:w-[65%] min-w-0">
                                <input
                                    type="url"
                                    value={newProjectLink}
                                    onChange={(e) => setNewProjectLink(e.target.value)}
                                    placeholder="https://"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all placeholder:text-gray-600 min-w-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newProjectName && newProjectLink) {
                                            setProjects([...projects, { name: newProjectName, link: newProjectLink }]);
                                            setNewProjectName('');
                                            setNewProjectLink('');
                                        }
                                    }}
                                    disabled={!newProjectName || !newProjectLink}
                                    className="shrink-0 p-3 bg-accent-500 text-black rounded-xl hover:bg-accent-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Stack: Digest & Save */}
                <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">
                    {/* Digest Subscription */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] group hover:border-accent-500/30 transition-all duration-500 relative overflow-hidden flex-1">
                        <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-accent-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                        <div className="flex flex-col sm:flex-row xl:flex-col sm:items-center xl:items-start justify-between gap-6 relative z-10 w-full h-full">
                            <div className="space-y-4">
                                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                                    <span className="text-accent-500">📫</span> Dispatch Feed
                                </h3>
                                <p className="text-[12px] font-medium text-gray-400 leading-relaxed max-w-[280px]">
                                    Receive a curated weekly dispatch of the network&apos;s most vital technical signals directly to your interface.
                                </p>
                            </div>
                            
                            <div className="mt-auto">
                                <button
                                    type="button"
                                    onClick={() => setDigestSubscription(!digestSubscription)}
                                    className={`relative w-20 h-10 shrink-0 rounded-full transition-colors border border-white/10 z-10 ${digestSubscription ? 'bg-accent-500/20 border-accent-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <div className={`absolute top-1.5 left-1.5 w-7 h-7 rounded-full transition-transform duration-300 ${digestSubscription ? 'translate-x-10 bg-accent-400 shadow-[0_0_15px_rgba(16,185,129,0.9)]' : 'translate-x-0 bg-gray-500'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className={`p-5 rounded-3xl border font-bold text-[11px] uppercase tracking-widest text-center shadow-2xl relative overflow-hidden ${message.type === 'success' ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                    <div className={`absolute inset-0 bg-gradient-to-r ${message.type === 'success' ? 'from-accent-500/0 via-accent-500/10 to-accent-500/0' : 'from-rose-500/0 via-rose-500/10 to-rose-500/0'} opacity-50`}></div>
                                    <span className="relative z-10">{message.text}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Final Action */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:border-accent-500/30">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full relative group/btn overflow-hidden rounded-[1.5rem] p-[2px] disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-accent-500 via-accent-300 to-accent-500 rounded-[1.5rem] opacity-70 group-hover/btn:opacity-100 animate-gradient-xy transition-opacity"></span>
                            <div className="relative bg-gray-950 group-hover/btn:bg-gray-950/90 transition-colors px-8 py-5 rounded-[1.4rem] flex items-center justify-center gap-3">
                                {saving ? (
                                    <div className="w-5 h-5 border-[3px] border-accent-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-6 h-6 text-accent-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                <span className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-md">
                                    {saving ? 'Processing...' : 'Synchronize'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
