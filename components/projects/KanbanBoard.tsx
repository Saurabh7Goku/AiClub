'use client';

import { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { updateTask, createTask } from '@/lib/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
    PlusIcon,
    EllipsisHorizontalIcon,
    UserIcon,
    CalendarIcon,
    FlagIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanBoardProps {
    projectId: string;
    clubId: string;
    tasks: Task[];
}

const COLUMNS: { id: TaskStatus; title: string, color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-500' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-accent-500' },
    { id: 'review', title: 'Review', color: 'bg-amber-400' },
    { id: 'done', title: 'Completed', color: 'bg-blue-500' }
];

export default function KanbanBoard({ projectId, clubId, tasks }: KanbanBoardProps) {
    const { user } = useAuth();
    const [showNewTaskModal, setShowNewTaskModal] = useState<TaskStatus | null>(null);

    const tasksByStatus = COLUMNS.reduce((acc, col) => {
        acc[col.id] = tasks.filter(t => t.status === col.id);
        return acc;
    }, {} as Record<TaskStatus, Task[]>);

    const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
        try {
            await updateTask(taskId, { status: newStatus });
        } catch (error) {
            console.error("Failed to move task:", error);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                {COLUMNS.map(col => (
                    <div 
                        key={col.id} 
                        className="w-[340px] shrink-0 flex flex-col gap-4"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('bg-white/5'); // Visual feedback
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.classList.remove('bg-white/5');
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('bg-white/5');
                            const taskId = e.dataTransfer.getData('taskId');
                            if (taskId) {
                                handleMoveTask(taskId, col.id);
                            }
                        }}
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[rgba(var(--card-bg),0.9)] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1 ${col.color} opacity-50`}></div>
                            <div className="flex items-center gap-3 relative z-10">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))]">{col.title}</span>
                                <span className="bg-white/10 text-gray-500 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-white/10">{tasksByStatus[col.id].length}</span>
                            </div>
                            <button
                                onClick={() => setShowNewTaskModal(col.id)}
                                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/20 relative z-10"
                            >
                                <PlusIcon className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Column Body */}
                        <div className="flex-1 flex flex-col gap-4 min-h-[500px]">
                            <AnimatePresence>
                                {tasksByStatus[col.id].map(task => (
                                    <TaskCard key={task.id} task={task} onMove={handleMoveTask} />
                                ))}
                            </AnimatePresence>

                            {tasksByStatus[col.id].length === 0 && (
                                <div className="flex-1 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-8 opacity-40 bg-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Empty Orbit</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* New Task Modal */}
            {showNewTaskModal && (
                <NewTaskModal
                    status={showNewTaskModal}
                    projectId={projectId}
                    clubId={clubId}
                    creatorId={user?.uid || ''}
                    onClose={() => setShowNewTaskModal(null)}
                />
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
            `}</style>
        </div>
    );
}

function TaskCard({ task, onMove }: { task: Task, onMove: (id: string, s: TaskStatus) => void }) {
    const priorityColors: Record<TaskPriority, string> = {
        low: 'text-gray-400',
        medium: 'text-sky-400',
        high: 'text-amber-400',
        urgent: 'text-rose-400'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            draggable
            onDragStart={(e: any) => {
                e.dataTransfer.setData('taskId', task.id);
                // Optional: set drag image or effect
                e.currentTarget.style.opacity = '0.5';
            }}
            onDragEnd={(e: any) => {
                e.currentTarget.style.opacity = '1';
            }}
            className="group bg-[rgba(var(--card-bg),0.9)] backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] hover:border-accent-500/30 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/5 blur-[30px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <FlagIcon className={`w-3 h-3 ${priorityColors[task.priority]}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${priorityColors[task.priority]}`}>{task.priority}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                        <EllipsisHorizontalIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                </div>
            </div>

            <h4 className="text-sm font-extrabold text-[rgb(var(--foreground-rgb))] leading-snug tracking-tight mb-3 truncate-2-lines relative z-10 group-hover:text-accent-400 transition-colors">{task.title}</h4>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        {task.assigneeId ? 'Assigned' : 'Open'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {task.status !== 'done' && (
                        <button
                            onClick={() => {
                                const next: Record<TaskStatus, TaskStatus> = {
                                    'todo': 'in_progress',
                                    'in_progress': 'review',
                                    'review': 'done',
                                    'done': 'done'
                                };
                                onMove(task.id, next[task.status]);
                            }}
                            className="bg-accent-500/10 text-accent-400 border border-accent-500/30 rounded-full p-1.5 hover:bg-accent-500 hover:text-black hover:scale-110 active:scale-90 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function NewTaskModal({ status, projectId, clubId, creatorId, onClose }: { status: TaskStatus, projectId: string, clubId: string, creatorId: string, onClose: () => void }) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !projectId || !creatorId) return;

        setLoading(true);
        try {
            await createTask({
                title,
                description: '',
                status,
                priority,
                projectId,
                clubId,
                creatorId,
                labels: [],
                order: Date.now()
            });
            onClose();
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background opacity-60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[rgba(var(--card-bg),0.95)] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-sm p-8 relative animate-elevator-in overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[50px] rounded-full pointer-events-none" />

                <h3 className="text-2xl font-extrabold text-[rgb(var(--foreground-rgb))] uppercase tracking-tighter mb-6 relative z-10">New Task</h3>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none ml-1">Task Title</label>
                        <input
                            autoFocus
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-5 py-3 bg-background border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 outline-none font-bold text-[rgb(var(--foreground-rgb))] placeholder:text-gray-600 text-sm transition-all shadow-inner"
                            placeholder="e.g. Design ML pipeline"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none ml-1">Priority</label>
                        <div className="flex gap-2">
                            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all ${priority === p ? 'bg-accent-500/20 text-accent-400 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105' : 'bg-white/5 border-transparent text-gray-500 hover:border-white/10 hover:text-gray-300'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title}
                            className="flex-[2] btn-primary py-3.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                        >
                            {loading ? '...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
