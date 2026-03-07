'use client';

import { useState } from 'react';
import { Milestone } from '@/types';
import { updateMilestone, createMilestone } from '@/lib/firebase/firestore';
import {
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    FlagIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

interface MilestoneTrackerProps {
    projectId: string;
    milestones: Milestone[];
}

export default function MilestoneTracker({ projectId, milestones }: MilestoneTrackerProps) {
    const [showAddModal, setShowAddModal] = useState(false);

    const handleToggleComplete = async (milestoneId: string, currentStatus: boolean) => {
        try {
            await updateMilestone(milestoneId, {
                isCompleted: !currentStatus,
                completedDate: !currentStatus ? new Date() : undefined
            });
        } catch (error) {
            console.error("Failed to toggle milestone:", error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-elevator-in">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-extrabold text-[rgb(var(--foreground-rgb))] uppercase tracking-tighter">Project Milestones</h2>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">High-level goals and critical deadlines</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-accent-500/10 text-accent-400 px-5 py-2.5 rounded-xl border border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-accent-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold uppercase tracking-widest text-[10px]"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Milestone
                </button>
            </div>

            {/* Progress Visualization */}
            <div className="bg-[rgba(var(--card-bg),0.9)] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-between gap-8 mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />

                <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Overall Progress</span>
                        <span className="text-3xl font-extrabold text-accent-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">{milestones.length > 0 ? Math.round((milestones.filter(m => m.isCompleted).length / milestones.length) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden shadow-inner flex relative">
                        <div className="absolute inset-0 bg-accent-500/10" />
                        <div
                            className="h-full bg-accent-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] transition-all duration-1000 ease-out relative z-10"
                            style={{ width: `${milestones.length > 0 ? (milestones.filter(m => m.isCompleted).length / milestones.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>
                <div className="flex flex-col items-center relative z-10 pl-8 border-l border-white/10">
                    <div className="text-4xl font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tighter">{milestones.filter(m => m.isCompleted).length}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-2">Goals Reached</div>
                </div>
            </div>

            {/* Milestones List */}
            <div className="space-y-5">
                {milestones.length > 0 ? (
                    milestones.map((m, idx) => (
                        <div key={m.id} className="group flex items-start gap-6 bg-[rgba(var(--card-bg),0.9)] backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-accent-500/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all relative overflow-hidden">
                            {m.isCompleted && <div className="absolute inset-0 bg-accent-500/5 pointer-events-none" />}

                            <button
                                onClick={() => handleToggleComplete(m.id, m.isCompleted)}
                                className={`shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition-all relative z-10 ${m.isCompleted ? 'bg-accent-500/20 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-gray-500 hover:text-white'}`}
                            >
                                {m.isCompleted ? (
                                    <CheckBadgeIcon className="w-7 h-7 text-accent-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-current" />
                                )}
                            </button>

                            <div className="flex-1 relative z-10 w-full min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                    <h4 className={`text-lg font-extrabold uppercase tracking-tight truncate ${m.isCompleted ? 'text-gray-500 line-through' : 'text-[rgb(var(--foreground-rgb))] group-hover:text-accent-400 transition-colors'}`}>{m.title}</h4>
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${m.isCompleted ? 'bg-white/5 border-transparent' : 'bg-accent-500/10 border-accent-500/20'} shrink-0`}>
                                        <CalendarIcon className={`w-3.5 h-3.5 ${m.isCompleted ? 'text-gray-500' : 'text-accent-500'}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${m.isCompleted ? 'text-gray-500' : 'text-accent-400'}`}>{m.targetDate.toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <p className={`text-sm font-medium leading-relaxed ${m.isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>{m.description}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="border border-dashed border-white/10 bg-white/5 backdrop-blur-sm rounded-[3rem] py-16 flex flex-col items-center justify-center opacity-70">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10">
                            <FlagIcon className="w-8 h-8 text-gray-500" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">No Milestones Set</span>
                    </div>
                )}
            </div>

            {showAddModal && <AddMilestoneModal projectId={projectId} onClose={() => setShowAddModal(false)} currentCount={milestones.length} />}
        </div>
    );
}

function AddMilestoneModal({ projectId, onClose, currentCount }: { projectId: string, onClose: () => void, currentCount: number }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !targetDate) return;

        setLoading(true);
        try {
            await createMilestone({
                projectId,
                title,
                description,
                targetDate: new Date(targetDate),
                isCompleted: false,
                order: currentCount
            });
            onClose();
        } catch (error) {
            console.error("Failed to add milestone:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background opacity-60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-[rgba(var(--card-bg),0.95)] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md p-8 relative animate-elevator-in overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[50px] rounded-full pointer-events-none" />

                <h2 className="text-3xl font-extrabold text-[rgb(var(--foreground-rgb))] tracking-tighter uppercase mb-2 relative z-10">Project Goal</h2>
                <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest text-[10px] relative z-10">Define a major step in collaboration</p>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Milestone Title</label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-5 py-3 bg-background border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-[rgb(var(--foreground-rgb))] placeholder:text-gray-600 transition-all shadow-inner"
                            placeholder="e.g. Model Architecture Frozen"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Target Date</label>
                        <input
                            required
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full px-5 py-3 bg-background border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-[rgb(var(--foreground-rgb))] transition-all shadow-inner [color-scheme:dark]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Success Criteria</label>
                        <textarea
                            required
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-5 py-3 bg-background border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-[rgb(var(--foreground-rgb))] placeholder:text-gray-600 transition-all shadow-inner resize-none"
                            placeholder="Clear requirements for completion..."
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-xl border border-white/10 bg-white/5 text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title || !targetDate || !description}
                            className="flex-[2] bg-accent-500 text-black px-6 py-4 rounded-xl border border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:grayscale active:scale-95"
                        >
                            {loading ? 'Adding...' : 'Add Milestone'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
