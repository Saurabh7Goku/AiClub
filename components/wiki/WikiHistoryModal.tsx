'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ClockIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { subscribeToWikiVersions, updateWikiArticle, createWikiVersion } from '@/lib/firebase/firestore';
import { WikiVersion } from '@/types';

interface WikiHistoryModalProps {
    articleId: string;
    currentContent: string;
    onClose: () => void;
    user: { uid: string; displayName: string | null };
}

export default function WikiHistoryModal({ articleId, currentContent, onClose, user }: WikiHistoryModalProps) {
    const [versions, setVersions] = useState<WikiVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<WikiVersion | null>(null);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        const unsub = subscribeToWikiVersions(articleId, (data) => {
            setVersions(data);
            setLoading(false);
            if (data.length > 0 && !selectedVersion) {
                setSelectedVersion(data[0]);
            }
        });
        return () => unsub();
    }, [articleId, selectedVersion]);

    const handleRestore = async () => {
        if (!selectedVersion || !user.displayName) return;
        setRestoring(true);
        try {
            // 1. Save current state as a new version before restoring (safety net)
            await createWikiVersion(articleId, currentContent, user.uid, user.displayName + " (Pre-restore)");
            
            // 2. Overwrite the article with the selected historical version
            await updateWikiArticle(articleId, {
                content: selectedVersion.content,
                authorId: user.uid,
                authorName: user.displayName
            });
            
            // 3. Add a history entry for the restore action
            await createWikiVersion(articleId, selectedVersion.content, user.uid, user.displayName + " (Restored Version)");
            
            onClose();
        } catch (error) {
            console.error('Failed to restore version:', error);
            alert('Restoration failed.');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-black/90 border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex overflow-hidden"
            >
                {/* Left Sidebar: Version List */}
                <div className="w-1/3 border-r border-white/10 bg-white/5 flex flex-col h-full">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                        <ClockIcon className="w-5 h-5 text-accent-500" />
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">Temporal Log</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {loading ? (
                            <div className="text-center py-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">Scanning history...</div>
                        ) : versions.length === 0 ? (
                            <div className="text-center py-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">No prior records found.</div>
                        ) : (
                            versions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVersion(v)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedVersion?.id === v.id ? 'bg-accent-500/10 border-accent-500/30' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}`}
                                >
                                    <div className="text-sm font-bold text-white mb-1">{v.authorName}</div>
                                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                                        {v.createdAt.toLocaleString()}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Area: Preview */}
                <div className="w-2/3 flex flex-col h-full">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Record Preview</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRestore}
                                disabled={!selectedVersion || restoring || selectedVersion.content === currentContent}
                                className="btn-primary flex items-center gap-2 py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                                {restoring ? 'Restoring...' : 'Restore Timepoint'}
                            </button>
                            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-xl transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-xs text-gray-300 whitespace-pre-wrap bg-black/50">
                        {selectedVersion ? selectedVersion.content : 'Select a version to preview.'}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
