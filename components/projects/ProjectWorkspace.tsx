'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, User, MeetingOutput } from '@/types';
import MeetingBoard from '@/components/meetings/MeetingBoard';
import CollaborativeBoard from '@/components/projects/CollaborativeBoard';
import { 
    DocumentTextIcon, 
    PencilSquareIcon, 
    LinkIcon, 
    XMarkIcon,
    PlusIcon,
    ArrowsPointingOutIcon,
    Bars2Icon,
    MicrophoneIcon,
    StopIcon,
    SparklesIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import { addProjectExternalLink, createMeetingOutput, clearMeetingBoard, subscribeToMeetingHistory, getMeetingBoardText, getMeetingCanvasData } from '@/lib/firebase/firestore';

interface ProjectWorkspaceProps {
    project: Project;
    user: User;
}

export default function ProjectWorkspace({ project, user }: ProjectWorkspaceProps) {
    const [viewMode, setViewMode] = useState<'text' | 'canvas' | 'split'>('text');
    const [showResourceNav, setShowResourceNav] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    
    // Resource addition state
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [resourceType, setResourceType] = useState<'onedrive' | 'github' | 'other'>('onedrive');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Meeting state ---
    const [recording, setRecording] = useState(false);
    const [recorderError, setRecorderError] = useState<string | null>(null);
    const recorderRef = useRef<{ mediaRecorder: MediaRecorder | null; chunks: Blob[] }>({ mediaRecorder: null, chunks: [] });
    const [processingAudio, setProcessingAudio] = useState(false);
    const [currentOutput, setCurrentOutput] = useState<MeetingOutput | null>(null);
    const [sessionHistory, setSessionHistory] = useState<MeetingOutput[]>([]);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [endingSession, setEndingSession] = useState(false);
    const boardQuillRef = useRef<any>(null);

    const meetingId = `project-${project.id}`;

    // --- Subscribe to meeting history ---
    useEffect(() => {
        const unsub = subscribeToMeetingHistory(meetingId, (outputs) => {
            setSessionHistory(outputs);
        });
        return () => unsub();
    }, [meetingId]);

    const getBoardText = useCallback(() => {
        try {
            const quill = boardQuillRef.current?.getEditor?.();
            return quill ? quill.getText() : '';
        } catch {
            return '';
        }
    }, []);

    // --- Recording Logic ---
    const startRecording = async () => {
        setRecorderError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setRecorderError('Recording not supported in this browser.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            recorderRef.current.chunks = [];
            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recorderRef.current.chunks.push(e.data);
            };
            mr.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
            };
            mr.start(250);
            recorderRef.current.mediaRecorder = mr;
            setRecording(true);
        } catch {
            setRecorderError('Microphone permission denied or unavailable.');
        }
    };

    const stopRecording = async (): Promise<Blob | null> => {
        const mr = recorderRef.current.mediaRecorder;
        if (!mr) return null;
        return await new Promise((resolve) => {
            const onStop = () => {
                mr.removeEventListener('stop', onStop);
                const blob = new Blob(recorderRef.current.chunks, { type: 'audio/webm' });
                recorderRef.current.mediaRecorder = null;
                recorderRef.current.chunks = [];
                setRecording(false);
                resolve(blob);
            };
            mr.addEventListener('stop', onStop);
            mr.stop();
        });
    };

    const handleEndAndGenerate = async () => {
        setProcessingAudio(true);
        try {
            let blob: Blob | null = null;
            if (recording) {
                blob = await stopRecording();
            }

            let boardText = getBoardText();
            if (!boardText || boardText.trim().length === 0) {
                const dbText = await getMeetingBoardText(meetingId);
                if (dbText && dbText.trim().length > 0) {
                    boardText = dbText;
                }
            }

            if ((!blob || blob.size === 0) && (!boardText || boardText.trim().length === 0)) {
                alert('No recording or transcript found to process.');
                setProcessingAudio(false);
                return;
            }

            let outputData: Omit<MeetingOutput, 'id' | 'meetingId' | 'clubId' | 'createdAt'>;

            const fd = new FormData();
            fd.append('meetingId', meetingId);
            if (blob && blob.size > 0) {
                fd.append('audio', new File([blob], `meeting_${meetingId}.webm`, { type: 'audio/webm' }));
            }
            if (boardText && boardText.trim().length > 0) {
                fd.append('boardText', boardText);
            }

            const res = await fetch('/api/meetings/process-audio', {
                method: 'POST',
                body: fd,
            });
            const json = await res.json();
            if (!res.ok || !json?.success || !json?.data) {
                throw new Error(json?.error || 'Failed to process session intelligence');
            }

            outputData = {
                modelUsed: json.data.modelUsed,
                transcript: json.data.transcript || 'No audio provided.',
                summaryNotes: json.data.summaryNotes || '',
                futureAgenda: json.data.futureAgenda || [],
                futureScopes: json.data.futureScopes || [],
                promises: json.data.promises || [],
                attendees: [user.uid], // In projects, everyone accesses it or we can just append current user
            };

            await createMeetingOutput(meetingId, project.clubId, outputData);
            setCurrentOutput({
                id: '',
                meetingId,
                clubId: project.clubId,
                createdAt: new Date(),
                ...outputData,
            });
        } catch (e) {
            console.error('Failed to generate output:', e);
            alert('Failed to process. Check console.');
        } finally {
            setProcessingAudio(false);
        }
    };

    const handleEndSession = async () => {
        if (endingSession) return;
        setEndingSession(true);
        try {
            // Capture the current board text as a snapshot
            let boardText = getBoardText();
            if (!boardText || boardText.trim().length === 0) {
                const dbText = await getMeetingBoardText(meetingId);
                if (dbText && dbText.trim().length > 0) {
                    boardText = dbText;
                }
            }

            // also capture any canvas drawings
            let canvasSnapshot: string | null = null;
            try {
                const canvas = await getMeetingCanvasData(meetingId);
                if (canvas && canvas.paths && canvas.paths.length > 0) {
                    canvasSnapshot = JSON.stringify(canvas.paths);
                }
            } catch (e) {
                console.error('Failed to read canvas when ending project session', e);
            }

            // Build the session output — either use existing briefing or create a board-notes-only session
            if (currentOutput) {
                // Save current output with the board snapshot attached
                await createMeetingOutput(meetingId, project.clubId, {
                    modelUsed: currentOutput.modelUsed,
                    transcript: currentOutput.transcript,
                    summaryNotes: currentOutput.summaryNotes,
                    futureAgenda: currentOutput.futureAgenda || [],
                    futureScopes: currentOutput.futureScopes || [],
                    promises: currentOutput.promises || [],
                    attendees: currentOutput.attendees || [],
                    boardSnapshot: boardText || undefined,
                    canvasSnapshot: canvasSnapshot || undefined,
                });
            } else if (boardText && boardText.trim().length > 1) {
                // No briefing generated yet — save board notes as a session record
                await createMeetingOutput(meetingId, project.clubId, {
                    modelUsed: 'manual-notes',
                    transcript: 'No audio provided.',
                    summaryNotes: 'Session notes captured from the collaborative board.',
                    futureAgenda: [],
                    futureScopes: [],
                    promises: [],
                    attendees: [user.uid],
                    boardSnapshot: boardText,
                    canvasSnapshot: canvasSnapshot || undefined,
                });
            } else {
                alert('Nothing to save — the board is empty and no briefing was generated.');
                setEndingSession(false);
                return;
            }

            // Clear the board for a fresh start
            await clearMeetingBoard(meetingId);

            // Reset state
            setCurrentOutput(null);
            setShowHistory(true); // Show the history panel with the saved session
        } catch (e) {
            console.error('Failed to end session:', e);
            alert('Failed to end session. Check console.');
        } finally {
            setEndingSession(false);
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resourceTitle || !resourceUrl) return;
        setIsSubmitting(true);
        try {
            await addProjectExternalLink(project.id, {
                title: resourceTitle,
                url: resourceUrl,
                type: resourceType
            });
            setResourceTitle('');
            setResourceUrl('');
        } catch (error) {
            console.error('Failed to add resource:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (d: Date) => {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-background relative font-sans">
            {/* ── Header Bar ── */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[rgba(var(--card-bg),0.9)] gap-3 flex-shrink-0">
                {/* View Switcher */}
                <div className="flex items-center bg-background p-1 rounded-xl border border-white/10">
                    {([
                        { id: 'text' as const, icon: DocumentTextIcon, label: 'Doc' },
                        { id: 'canvas' as const, icon: PencilSquareIcon, label: 'Canvas' },
                        { id: 'split' as const, icon: Bars2Icon, label: 'Split', hideOnMobile: true },
                    ]).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${tab.hideOnMobile ? 'hidden md:flex' : 'flex'} ${viewMode === tab.id ? 'bg-accent-500/20 text-accent-400' : 'text-gray-500 hover:text-[rgb(var(--foreground-rgb))]'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {!recording ? (
                        <button onClick={startRecording}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))] transition-colors">
                            <MicrophoneIcon className="w-3.5 h-3.5 text-accent-500" /> Record
                        </button>
                    ) : (
                        <button onClick={() => stopRecording()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors animate-pulse">
                            <StopIcon className="w-3.5 h-3.5" /> Stop
                        </button>
                    )}

                    <button onClick={handleEndAndGenerate} disabled={processingAudio}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500/10 border border-accent-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-accent-400 hover:bg-accent-500/20 transition-colors disabled:opacity-50">
                        <SparklesIcon className="w-3.5 h-3.5" /> {processingAudio ? 'Processing...' : 'Briefing'}
                    </button>

                    <button onClick={handleEndSession} disabled={endingSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                        <CheckIcon className="w-3.5 h-3.5" /> {endingSession ? 'Saving...' : 'End Session'}
                    </button>

                    <button onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${showHistory ? 'bg-accent-500/10 border-accent-500/30 text-accent-400' : 'bg-card hover:bg-white/5 border-white/10 text-[rgb(var(--foreground-rgb))]'}`}>
                        <ClockIcon className="w-3.5 h-3.5" /> Sessions ({sessionHistory.length})
                    </button>

                    <button onClick={() => setShowResourceNav(!showResourceNav)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))] transition-colors">
                        <LinkIcon className="w-3.5 h-3.5" /> Resources ({project.externalLinks?.length || 0})
                    </button>
                </div>
            </div>

            {/* Recording Status */}
            {(recording || recorderError) && (
                <div className="px-5 py-2 border-b border-white/5 bg-background opacity-50 flex items-center gap-3 flex-shrink-0">
                    {recording && (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            Recording Audio...
                        </div>
                    )}
                    {recorderError && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-red-400">{recorderError}</div>
                    )}
                </div>
            )}

            {/* ── Main Workspace Area ── */}
            <div className="flex overflow-hidden h-[600px]">
                {/* Editor / Canvas Views */}
                <div className="flex-1 flex overflow-hidden">
                    {(viewMode === 'text' || viewMode === 'split') && (
                        <div className={`flex-1 flex flex-col overflow-hidden ${viewMode === 'split' ? 'border-r border-white/10' : ''}`}>
                            <MeetingBoard 
                                meetingId={meetingId} 
                                user={{ uid: user.uid, displayName: user.displayName }} 
                                quillRef={boardQuillRef}
                            />
                        </div>
                    )}
                    
                    {(viewMode === 'canvas' || viewMode === 'split') && (
                        <div className="flex-1 overflow-hidden">
                            <CollaborativeBoard projectId={project.id} />
                        </div>
                    )}
                </div>

                {/* Resources Sidebar */}
                <AnimatePresence>
                    {showResourceNav && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-background border-l border-white/10 flex flex-col overflow-hidden flex-shrink-0"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))]">Resources</h3>
                                <button onClick={() => setShowResourceNav(false)} className="text-gray-500 hover:text-[rgb(var(--foreground-rgb))]">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                <form onSubmit={handleAddResource} className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-accent-500">Add Resource</h4>
                                    <input required type="text" placeholder="Label..."
                                        value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)}
                                        className="w-full bg-background border border-white/10 rounded-lg p-2 text-xs text-[rgb(var(--foreground-rgb))] placeholder-gray-600 focus:border-accent-500/50 outline-none transition-colors" />
                                    <div className="flex items-center gap-2">
                                        <select value={resourceType} onChange={(e) => setResourceType(e.target.value as any)}
                                            className="bg-background border border-white/10 rounded-lg p-2 text-xs text-gray-400 outline-none w-20 flex-shrink-0">
                                            <option value="onedrive">Drive</option>
                                            <option value="github">Repo</option>
                                            <option value="other">Link</option>
                                        </select>
                                        <input required type="url" placeholder="https://..."
                                            value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)}
                                            className="flex-1 bg-background opacity-40 border border-white/10 rounded-lg p-2 text-xs text-[rgb(var(--foreground-rgb))] placeholder-gray-600 focus:border-accent-500/50 outline-none transition-colors min-w-0" />
                                    </div>
                                    <button type="submit" disabled={isSubmitting}
                                        className="w-full py-2 bg-background hover:bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                                        {isSubmitting ? 'Adding...' : <><PlusIcon className="w-3 h-3" /> Add</>}
                                    </button>
                                </form>

                                <div className="space-y-1.5">
                                    {(!project.externalLinks || project.externalLinks.length === 0) && (
                                        <div className="text-center p-5 bg-white/5 border border-white/5 rounded-xl border-dashed">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">No resources yet</p>
                                        </div>
                                    )}
                                    {project.externalLinks?.map((link, idx) => (
                                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                                            className="block p-3 bg-card hover:bg-white/5 border border-white/10 rounded-xl group transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-[rgb(var(--foreground-rgb))] truncate">{link.title}</div>
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{link.type}</div>
                                                </div>
                                                <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-gray-500 group-hover:text-accent-400 transition-colors flex-shrink-0" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Current Session Briefing ── */}
            {currentOutput && (
                <SessionCard
                    output={currentOutput}
                    label="Latest Briefing"
                    defaultExpanded={true}
                    onDismiss={() => setCurrentOutput(null)}
                    formatDate={formatDate}
                />
            )}

            {/* ── Session History ── */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 bg-[rgba(var(--card-bg),0.9)] overflow-hidden"
                    >
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-accent-500" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))]">Session History</h3>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                                    {sessionHistory.length} session{sessionHistory.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {sessionHistory.length === 0 ? (
                                <div className="text-center py-8 bg-white/5 border border-white/5 rounded-xl border-dashed">
                                    <SparklesIcon className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">No sessions recorded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--foreground-rgb), 0.1) transparent' }}>
                                    {sessionHistory.map((output) => (
                                        <SessionCard
                                            key={output.id}
                                            output={output}
                                            label={formatDate(output.createdAt)}
                                            defaultExpanded={expandedSessionId === output.id}
                                            onToggle={() => setExpandedSessionId(expandedSessionId === output.id ? null : output.id)}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

// ─── Session Card Component ───
function SessionCard({
    output,
    label,
    defaultExpanded,
    onToggle,
    onDismiss,
    formatDate,
}: {
    output: MeetingOutput;
    label: string;
    defaultExpanded?: boolean;
    onToggle?: () => void;
    onDismiss?: () => void;
    formatDate: (d: Date) => string;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded ?? false);

    const toggle = () => {
        setExpanded(!expanded);
        onToggle?.();
    };

    return (
        <div className="border-t border-white/10 bg-[rgba(var(--card-bg),1)]">
            <button onClick={toggle}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-2.5 min-w-0">
                    <SparklesIcon className="w-4 h-4 text-accent-500 flex-shrink-0" />
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--foreground-rgb))] truncate">{label}</div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            {output.modelUsed}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {onDismiss && (
                        <button onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="text-gray-500 hover:text-white p-1">
                            <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {expanded ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />}
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                    <div className="pt-3 space-y-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Executive Summary</div>
                        <div className="text-sm text-[rgb(var(--foreground-rgb))] opacity-80 leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-white/5">
                            {output.summaryNotes}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Promises / Actions</div>
                            <div className="space-y-1 bg-background p-3 rounded-xl border border-white/5">
                                {(output.promises || []).map((p, i) => (
                                    <div key={i} className="text-sm text-[rgb(var(--foreground-rgb))] opacity-80 flex gap-2"><span className="text-accent-500">›</span> {p}</div>
                                ))}
                                {(!output.promises || output.promises.length === 0) && <p className="text-xs text-gray-500">None</p>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Future Agenda</div>
                            <div className="space-y-1 bg-background p-3 rounded-xl border border-white/5">
                                {(output.futureAgenda || []).map((a, i) => (
                                    <div key={i} className="text-sm text-[rgb(var(--foreground-rgb))] opacity-80 flex gap-2"><span className="text-accent-500">{i+1}.</span> {a}</div>
                                ))}
                                {(!output.futureAgenda || output.futureAgenda.length === 0) && <p className="text-xs text-gray-500">None</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Future Scopes</div>
                        <div className="flex flex-wrap gap-2 bg-background p-3 rounded-xl border border-white/5">
                            {(output.futureScopes || []).map((scope, i) => (
                                <div key={i} className="px-2 py-1 bg-accent-500/10 border border-accent-500/20 rounded-md text-[10px] font-bold text-accent-400">
                                    {scope}
                                </div>
                            ))}
                            {(!output.futureScopes || output.futureScopes.length === 0) && <p className="text-xs text-gray-500">None</p>}
                        </div>
                    </div>

                    {output.transcript && (
                        <details className="group border border-white/10 rounded-xl overflow-hidden">
                            <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-white bg-white/5 px-4 py-2 transition-colors flex justify-between items-center">
                                Transcript
                                <svg className="w-3.5 h-3.5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </summary>
                            <div className="p-4 text-xs font-mono text-gray-500 bg-background opacity-40 whitespace-pre-wrap leading-relaxed border-t border-white/10 max-h-40 overflow-y-auto">{output.transcript}</div>
                        </details>
                    )}

                    {output.boardSnapshot && (
                        <details className="group border border-accent-500/20 rounded-xl overflow-hidden">
                            <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-accent-500 hover:text-accent-400 bg-accent-500/5 px-4 py-2 transition-colors flex justify-between items-center">
                                📄 Board Notes Snapshot
                                <svg className="w-3.5 h-3.5 text-accent-500/60 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </summary>
                            <div className="p-4 text-xs text-[rgb(var(--foreground-rgb))] opacity-80 bg-background opacity-40 whitespace-pre-wrap leading-relaxed border-t border-accent-500/10 max-h-48 overflow-y-auto">{output.boardSnapshot}</div>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}
