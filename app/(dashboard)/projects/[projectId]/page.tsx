'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { subscribeToProjects, subscribeToTasks, subscribeToMilestones, inviteUserToClubAndTeam, updateProject } from '@/lib/firebase/firestore';
import { Project, Task, Milestone } from '@/types';
import KanbanBoard from '@/components/projects/KanbanBoard';
import MilestoneTracker from '@/components/projects/MilestoneTracker';
import ProjectWorkspace from '@/components/projects/ProjectWorkspace';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Squares2X2Icon,
    FlagIcon,
    PencilSquareIcon,
    DocumentTextIcon,
    ArrowLeftIcon,
    CalendarIcon,
    LinkIcon,
    UserPlusIcon,
    XMarkIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { currentClub } = useClub();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [activeTab, setActiveTab] = useState<'board' | 'milestones' | 'workspace'>('board');
    const [loading, setLoading] = useState(true);
    const [isEditingDeadline, setIsEditingDeadline] = useState(false);
    const [editedDeadline, setEditedDeadline] = useState("");

    // Invite Modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    useEffect(() => {
        if (!projectId || !currentClub) return;

        // Sub to Project Info
        const unsubProject = subscribeToProjects(currentClub.id, (projects) => {
            const p = projects.find(item => item.id === projectId);
            if (p) setProject(p);
            setLoading(false);
        });

        // Sub to Tasks
        const unsubTasks = subscribeToTasks(projectId, (fetchedTasks) => {
            setTasks(fetchedTasks);
        });

        // Sub to Milestones
        const unsubMilestones = subscribeToMilestones(projectId, (fetchedMilestones) => {
            setMilestones(fetchedMilestones);
        });

        return () => {
            unsubProject();
            unsubTasks();
            unsubMilestones();
        };
    }, [projectId, currentClub]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClub || !user || !project) return;

        setIsInviting(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            await inviteUserToClubAndTeam(
                user.uid,
                user.displayName,
                inviteEmail,
                currentClub.id,
                project.id
            );
            setInviteSuccess(true);
            setInviteEmail('');
            setTimeout(() => {
                setIsInviteModalOpen(false);
                setInviteSuccess(false);
            }, 2000);
        } catch (error: any) {
            console.error('Failed to invite:', error);
            setInviteError(error.message || 'Failed to send invitation.');
        } finally {
            setIsInviting(false);
        }
    };

    const handleDeadlineUpdate = async () => {
        if (!projectId || !editedDeadline) return;
        try {
            const date = new Date(editedDeadline);
            // Ensure we set to midnight/local to avoid TZ drift
            date.setHours(0, 0, 0, 0);

            await updateProject(projectId, { targetDate: date } as any);
            setIsEditingDeadline(false);
        } catch (error) {
            console.error('Failed to update deadline:', error);
            alert('Failed to update project deadline.');
        }
    };

    if (loading) {
        return <div className="animate-pulse space-y-8 p-8 max-w-7xl mx-auto">
            <div className="h-24 bg-white/5 rounded-3xl border border-white/10" />
            <div className="h-[600px] bg-white/5 rounded-[2.5rem] border border-white/10" />
        </div>;
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-elevator-in">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white mb-2">Initiative Not Found</h1>
                    <p className="text-gray-400 text-sm font-medium mb-6">This project may have been deleted or you don&apos;t have access.</p>
                    <button onClick={() => router.push('/projects')} className="text-accent-500 font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:text-accent-400 transition-colors bg-white/5 px-6 py-3 rounded-xl border border-white/10 mx-auto">
                        <ArrowLeftIcon className="w-4 h-4" /> Back to Initiatives
                    </button>
                </div>
            </div>
        );
    }

    const isLeadOrAdmin = user && (user.uid === project.leadId || user.role === 'admin' || currentClub?.adminId === user.uid);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-elevator-in">
            {/* Header / Context Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />

                <div className="space-y-4 relative z-10">
                    <button onClick={() => router.push('/projects')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 group">
                        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Initiatives
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase leading-none">{project.name}</h1>
                            <span className="bg-accent-500/10 text-accent-400 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-accent-500/30">
                                {project.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-400 max-w-2xl leading-relaxed">{project.description}</p>
                    </div>
                </div>

                <div className="flex lg:flex-row flex-col gap-4 relative z-10">
                    <div className="flex flex-wrap items-center gap-5 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">Contributors</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-white uppercase">{project.members.length} Active Nodes</span>
                                {isLeadOrAdmin && (
                                    <button
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="p-1.5 hover:bg-accent-500/20 rounded-lg transition-colors border border-transparent hover:border-accent-500/30 group"
                                        title="Invite Contributor"
                                    >
                                        <UserPlusIcon className="w-4 h-4 text-accent-500 group-hover:text-accent-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
                                Deadline
                                {isLeadOrAdmin && !isEditingDeadline && (
                                    <button
                                        onClick={() => {
                                            setIsEditingDeadline(true);
                                            const d = project.targetDate instanceof Date ? project.targetDate : (project.targetDate ? new Date(project.targetDate) : new Date());
                                            setEditedDeadline(d.toISOString().split('T')[0]);
                                        }}
                                        className="text-accent-500 hover:text-accent-400 transition-colors"
                                    >
                                        <PencilSquareIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                            {isEditingDeadline ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={editedDeadline}
                                        onChange={(e) => setEditedDeadline(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-accent-500/50"
                                    />
                                    <button onClick={handleDeadlineUpdate} className="text-accent-500 hover:text-accent-400 text-[10px] font-bold uppercase">Save</button>
                                    <button onClick={() => setIsEditingDeadline(false)} className="text-gray-500 hover:text-gray-400 text-[10px] font-bold uppercase">Cancel</button>
                                </div>
                            ) : (
                                <span className="text-xs font-extrabold text-white uppercase flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                    {project.targetDate ?
                                        (project.targetDate instanceof Date ? project.targetDate.toLocaleDateString() : new Date(project.targetDate).toLocaleDateString()) :
                                        'TBD'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.3)] w-full overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('board')}
                    className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'board' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-gray-300 border border-transparent hover:bg-white/5'}`}
                >
                    <Squares2X2Icon className="w-4 h-4" /> Board
                </button>
                <button
                    onClick={() => setActiveTab('milestones')}
                    className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'milestones' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-gray-300 border border-transparent hover:bg-white/5'}`}
                >
                    <FlagIcon className="w-4 h-4" /> Milestones
                </button>
                <button
                    onClick={() => setActiveTab('workspace')}
                    className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'workspace' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-gray-300 border border-transparent hover:bg-white/5'}`}
                >
                    <Squares2X2Icon className="w-4 h-4" /> Collab Hub
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[600px] animate-elevator-in">
                {activeTab === 'board' && (
                    <KanbanBoard projectId={project.id} tasks={tasks} clubId={project.clubId} />
                )}
                {activeTab === 'milestones' && (
                    <MilestoneTracker projectId={project.id} milestones={milestones} />
                )}
                {activeTab === 'workspace' && user && (
                    <ProjectWorkspace project={project} user={user} />
                )}
            </div>

            {/* Invitation Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsInviteModalOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/90 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[50px] rounded-full pointer-events-none" />

                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="absolute right-6 top-6 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-transparent hover:border-white/10 z-10"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white leading-none">Draft Contributor</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-500">{project.name}</p>
                                </div>

                                <form onSubmit={handleInvite} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Platform Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="researcher@lab.ai"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:border-accent-500/50 outline-none transition-all text-white placeholder-gray-600 shadow-inner focus:ring-1 focus:ring-accent-500/50"
                                        />
                                    </div>

                                    {inviteError && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                                            {inviteError}
                                        </div>
                                    )}

                                    {inviteSuccess && (
                                        <div className="p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl text-[10px] font-bold text-accent-400 uppercase tracking-widest leading-relaxed">
                                            Recruitment signal transmitted successfully.
                                        </div>
                                    )}

                                    <button
                                        disabled={isInviting || inviteSuccess}
                                        type="submit"
                                        className="w-full btn-primary py-4 px-6 text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:grayscale disabled:opacity-50 active:scale-[0.98] transition-all relative overflow-hidden group"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isInviting ? (
                                                <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Transmitting...</>
                                            ) : 'Send Recruitment Signal'}
                                        </span>
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    </button>
                                </form>

                                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                                    <div className="flex gap-4 items-start">
                                        <div className="p-2 bg-white/5 rounded-lg shrink-0">
                                            <InformationCircleIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase pt-0.5">
                                            Inviting a operative to this initiative will also authorize them for the parent node if they don&apos;t already have clearance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
