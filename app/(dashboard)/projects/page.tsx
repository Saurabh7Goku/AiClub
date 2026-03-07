'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToProjects, createProject } from '@/lib/firebase/firestore';
import { Project, ProjectStatus } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon, UserGroupIcon, CalendarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ProjectsPage() {
    const { user } = useAuth();
    const { currentClub } = useClub();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (!currentClub) return;

        const unsub = subscribeToProjects(currentClub.id, (fetchedProjects) => {
            setProjects(fetchedProjects);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [currentClub]);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-elevator-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none">
                        Initiatives
                    </h1>
                    <p className="text-gray-400 font-medium mt-2 text-sm">Active projects and collaborative research</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search initiatives..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-72 pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium placeholder-gray-500 text-white focus:outline-none focus:border-accent-500 focus:bg-white/10 transition-all shadow-inner"
                        />
                    </div>
                    {user && (user.role === 'leader' || user.role === 'admin') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center justify-center gap-2 bg-accent-500 text-black px-6 py-3 rounded-xl border border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all font-bold uppercase tracking-widest text-xs"
                        >
                            <PlusIcon className="w-4 h-4" />
                            New Project
                        </button>
                    )}
                </div>
            </div>

            {/* Project Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="h-64 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 border-dashed shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner mb-6">
                        <Square3Stack3DIcon className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">No initiatives found</h3>
                    <p className="text-gray-400 font-medium mt-2">Start a new initiative to begin collaborating</p>
                </div>
            )}

            {/* Create Project Modal (Placeholder) */}
            {showCreateModal && (
                <CreateProjectModal
                    onClose={() => setShowCreateModal(false)}
                    clubId={currentClub?.id || ''}
                    leaderId={user?.uid || ''}
                />
            )}
        </div>
    );
}

function ProjectCard({ project }: { project: Project }) {
    const statusColors: Record<ProjectStatus, string> = {
        planning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        active: 'bg-accent-500/10 text-accent-400 border-accent-500/30',
        on_hold: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        archived: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    };

    return (
        <Link href={`/projects/${project.id}`}>
            <div className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-accent-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all h-full flex flex-col cursor-pointer overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[40px] rounded-full group-hover:bg-accent-500/10 transition-colors pointer-events-none" />

                <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${statusColors[project.status]}`}>
                        {project.status.replace('_', ' ')}
                    </div>
                    <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((m, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow-sm relative z-10">
                                {m.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {project.members.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-accent-500/20 border border-accent-500/40 flex items-center justify-center text-[10px] font-bold text-accent-400 shadow-sm relative z-0">
                                +{project.members.length - 3}
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-xl font-extrabold text-white mb-3 group-hover:text-accent-400 transition-colors uppercase tracking-tight leading-tight relative z-10">{project.name}</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed mb-6 line-clamp-3 relative z-10">
                    {project.description}
                </p>

                <div className="mt-auto space-y-3 pt-5 border-t border-white/10 relative z-10">
                    <div className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        Started {project.startDate.toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <UserGroupIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {project.members.length} Contributors
                    </div>
                </div>

                {/* Progress Bar (Fake for now) */}
                <div className="mt-5 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner relative z-10">
                    <div className="h-full bg-accent-500 w-1/3 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
            </div>
        </Link>
    );
}

function Square3Stack3DIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l-5.571 3-5.571-3" />
        </svg>
    )
}

function CreateProjectModal({ onClose, clubId, leaderId }: { onClose: () => void, clubId: string, leaderId: string }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!clubId) {
            setError("Active Club context missing. Please select a club.");
            return;
        }
        if (!leaderId) {
            setError("Identity verification failed. Please re-login.");
            return;
        }
        if (!name.trim() || !description.trim()) {
            setError("Mission parameters incomplete. All fields required.");
            return;
        }

        setLoading(true);
        try {
            const newProjectId = await createProject({
                name: name.trim(),
                description: description.trim(),
                clubId,
                leadId: leaderId,
                members: [leaderId],
                status: 'planning',
                startDate: new Date(),
            });
            onClose();
            router.push(`/projects/${newProjectId}`);
        } catch (err: any) {
            console.error("Failed to create project:", err);
            setError(err.message || "Transmission failed. Check network or permissions.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-black/90 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md p-8 relative animate-elevator-in">
                <h2 className="text-3xl font-extrabold text-white tracking-tighter uppercase mb-2">New Initiative</h2>
                <p className="text-gray-400 font-bold mb-6 uppercase tracking-widest text-[10px]">Define the scope and launch the project</p>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-loose">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Project Name</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-white placeholder:text-gray-600 transition-all shadow-inner"
                            placeholder="e.g. Neural Link Research"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Mission Statement</label>
                        <textarea
                            required
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-white placeholder:text-gray-600 transition-all shadow-inner resize-none"
                            placeholder="Describe the goals and impact..."
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-xl border border-white/10 bg-white/5 text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name || !description}
                            className="flex-[2] bg-accent-500 text-black px-6 py-4 rounded-xl border border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? 'Launching...' : 'Launch Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
