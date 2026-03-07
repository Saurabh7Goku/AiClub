'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/firebase/firestore';
import { TechFeedCategory } from '@/types';

const CATEGORIES: TechFeedCategory[] = ['LLM', 'Vision', 'Infra', 'Agents', 'Research', 'Industry', 'Tools'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const AVAILABILITY_STATUSES = ['Available', 'Busy', 'Looking for Project'];

export default function OnboardingPage() {
    const { user: authUser } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form State
    const [bio, setBio] = useState('');
    const [expertise, setExpertise] = useState<string[]>([]);
    const [experienceLevel, setExperienceLevel] = useState('Beginner');
    const [availabilityStatus, setAvailabilityStatus] = useState('Available');
    const [projects, setProjects] = useState<{ name: string; link: string }[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLink, setNewProjectLink] = useState('');
    const [github, setGithub] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [portfolio, setPortfolio] = useState('');

    useEffect(() => {
        if (authUser?.profile?.onboardingComplete) {
            router.replace('/dashboard');
        }
    }, [authUser, router]);

    const handleToggleExpertise = (cat: string) => {
        setExpertise(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleAddProject = () => {
        if (newProjectName && newProjectLink) {
            setProjects([...projects, { name: newProjectName, link: newProjectLink }]);
            setNewProjectName('');
            setNewProjectLink('');
        }
    };

    const handleRemoveProject = (index: number) => {
        setProjects(projects.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (!authUser) return;
        setSaving(true);

        try {
            await updateUser(authUser.uid, {
                profile: {
                    ...authUser.profile,
                    bio,
                    expertise,
                    experienceLevel: experienceLevel as any,
                    availabilityStatus: availabilityStatus as any,
                    projectsWorkedOn: projects,
                    externalLinks: {
                        github: github || '',
                        linkedin: linkedin || '',
                        portfolio: portfolio || ''
                    },
                    onboardingComplete: true
                }
            } as any);
            router.replace('/dashboard');
        } catch (error) {
            console.error('Failed to update onboarding profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-6 space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 relative">
                    <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />

                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-accent-500/30 text-accent-400 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Synchronization Required</span>
                        </div>
                    </div>

                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
                        Initialize <span className="text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Identity</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-medium relative z-10 mt-2">
                        Calibrate your research parameters for the intelligence clusters.
                    </p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-4 relative z-10">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-extrabold text-lg transition-all duration-500 ${step === s
                                ? 'bg-accent-500 text-black border-accent-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110'
                                : step > s
                                    ? 'bg-accent-500/20 text-accent-400 border-accent-500/50'
                                    : 'bg-white/5 text-gray-500 border-white/10'
                            }`}>
                            {step > s ? '✓' : s}
                        </div>
                        {s < 3 && (
                            <div className="w-12 h-1 overflow-hidden bg-white/10 rounded-full">
                                <div className={`h-full bg-accent-500 transition-all duration-500 ${step > s ? 'w-full' : 'w-0'}`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="animate-elevator-in">
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white border-b border-white/10 pb-4 relative z-10 w-full flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-accent-500/20 text-accent-500 flex items-center justify-center border border-accent-500/30 text-lg">⚡</span>
                                Core Parameters
                            </h2>

                            <div className="space-y-3 relative z-10">
                                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Professional Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all min-h-[120px] outline-none shadow-inner custom-scrollbar placeholder:text-gray-600"
                                    placeholder="Tell the club about your research focus and AI interests..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Experience Level</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {EXPERIENCE_LEVELS.map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setExperienceLevel(lvl)}
                                                className={`px-5 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all border text-left flex items-center justify-between ${experienceLevel === lvl
                                                        ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {lvl}
                                                {experienceLevel === lvl && <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Availability Status</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {AVAILABILITY_STATUSES.map(stat => (
                                            <button
                                                key={stat}
                                                onClick={() => setAvailabilityStatus(stat)}
                                                className={`px-5 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all border text-left flex items-center justify-between ${availabilityStatus === stat
                                                        ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {stat}
                                                {availabilityStatus === stat && <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setStep(2)} className="btn-primary py-4 px-12 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] group flex items-center gap-2">
                                Next Phase
                                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white border-b border-white/10 pb-4 relative z-10 w-full flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-accent-500/20 text-accent-500 flex items-center justify-center border border-accent-500/30 text-lg">🧠</span>
                                Expertise & Skills
                            </h2>

                            <div className="space-y-2 relative z-10">
                                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Intelligence Clusters</label>
                                <p className="text-sm font-medium text-gray-500">Select multiple tags to calibrate team matching.</p>
                            </div>

                            <div className="flex flex-wrap gap-3 relative z-10">
                                {CATEGORIES.map(cat => {
                                    const active = expertise.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => handleToggleExpertise(cat)}
                                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all border ${active
                                                ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-6 space-y-4 relative z-10 border-t border-white/10">
                                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Research Portfolio</label>
                                <div className="space-y-4">
                                    {projects.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/30 transition-colors">
                                            <div>
                                                <p className="font-extrabold text-white">{p.name}</p>
                                                <a href={p.link} target="_blank" className="text-xs text-accent-500 font-bold hover:text-accent-400 transition-colors mt-1 block">{p.link}</a>
                                            </div>
                                            <button onClick={() => handleRemoveProject(i)} className="p-2 text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border border-dashed border-white/20 rounded-2xl bg-black/20 hover:border-accent-500/50 transition-colors">
                                        <input
                                            type="text"
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                            placeholder="Project Name..."
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all placeholder:text-gray-600"
                                        />
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="url"
                                                value={newProjectLink}
                                                onChange={(e) => setNewProjectLink(e.target.value)}
                                                placeholder="Link (Github/Live)..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all placeholder:text-gray-600"
                                            />
                                            <button onClick={handleAddProject} className="p-3 bg-accent-500 text-black rounded-xl hover:bg-accent-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <button onClick={() => setStep(1)} className="text-gray-400 font-bold uppercase text-[11px] tracking-widest hover:text-white transition-colors flex items-center gap-2">
                                <span className="text-lg">←</span> Back
                            </button>
                            <button onClick={() => setStep(3)} className="btn-primary py-4 px-12 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] group flex items-center gap-2">
                                Final Step
                                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-accent-500/30 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white border-b border-white/10 pb-4 relative z-10 w-full flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-accent-500/20 text-accent-500 flex items-center justify-center border border-accent-500/30 text-lg">🔗</span>
                                External Nodes
                            </h2>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">GitHub Profile</label>
                                    <input
                                        type="text"
                                        value={github}
                                        onChange={(e) => setGithub(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all outline-none shadow-inner placeholder:text-gray-600"
                                        placeholder="github.com/username"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">LinkedIn Identity</label>
                                    <input
                                        type="text"
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all outline-none shadow-inner placeholder:text-gray-600"
                                        placeholder="linkedin.com/in/username"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Personal Interface (Portfolio)</label>
                                    <input
                                        type="url"
                                        value={portfolio}
                                        onChange={(e) => setPortfolio(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 focus:bg-white/10 transition-all outline-none shadow-inner placeholder:text-gray-600"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <button onClick={() => setStep(2)} className="text-gray-400 font-bold uppercase text-[11px] tracking-widest hover:text-white transition-colors flex items-center gap-2">
                                <span className="text-lg">←</span> Back
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={saving || !bio || expertise.length === 0}
                                className="btn-primary py-4 px-12 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] group flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                            >
                                {saving ? 'Initializing Identity...' : 'Synchronize Identity'}
                                {!saving && <span className="inline-block transition-transform group-hover:scale-125">⚡</span>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
