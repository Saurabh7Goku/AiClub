'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getWikiArticle, WikiArticle, updateWikiArticle, createWikiVersion } from '@/lib/firebase/firestore';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, TagIcon, PencilIcon, CheckIcon, XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import WikiHistoryModal from '@/components/wiki/WikiHistoryModal';

export default function WikiArticlePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const articleId = params.articleId as string;

    const [article, setArticle] = useState<WikiArticle | null>(null);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const loadArticle = useCallback(async () => {
        setLoading(true);
        const a = await getWikiArticle(articleId);
        setArticle(a);
        if (a) setEditContent(a.content);
        setLoading(false);
    }, [articleId]);

    useEffect(() => {
        loadArticle();
    }, [loadArticle]);


    const handleSaveEdit = async () => {
        if (!article || !user) return;
        setIsSaving(true);
        try {
            await createWikiVersion(articleId, article.content, article.authorId, article.authorName);
            
            await updateWikiArticle(articleId, {
                content: editContent,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous'
            });
            
            const updated = await getWikiArticle(articleId);
            setArticle(updated);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving article:', error);
            alert('Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Loading Record...</p>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-elevator-in">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4v2m0 4v2M4 21h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-white uppercase tracking-wider">Record Not Found</h2>
                    <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto font-medium">This knowledge record may have been expunged or does not exist.</p>
                </div>
                <button onClick={() => router.push('/wiki')} className="btn-primary py-2.5 px-8 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-shadow flex items-center gap-2">
                    <ArrowLeftIcon className="w-4 h-4" /> Return to Database
                </button>
            </div>
        );
    }

    // Simple markdown-like renderer for display
    const renderContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-extrabold uppercase tracking-tight text-white mt-8 mb-4 pb-2 border-b border-white/10">{line.slice(3)}</h2>;
            if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-extrabold uppercase tracking-tight text-white mt-8 mb-4">{line.slice(2)}</h1>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold uppercase tracking-tight text-gray-300 mt-6 mb-3">{line.slice(4)}</h3>;
            if (line.match(/^\d+\.\s/)) return <p key={i} className="text-gray-300 font-medium text-[15px] leading-relaxed ml-4 my-2">{line}</p>;
            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-gray-300 font-medium text-[15px] leading-relaxed ml-6 list-disc my-2">{line.slice(2)}</li>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="text-gray-400 font-medium text-[15px] leading-relaxed my-3">{line}</p>;
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-elevator-in pb-20">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push('/wiki')}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-accent-400 transition-colors group outline-none"
                >
                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Knowledge Base
                </button>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" /> History
                    </button>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn-primary flex items-center gap-2 py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                            <PencilIcon className="w-4 h-4" /> Edit Record
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setEditContent(article.content); }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" /> Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving || editContent.trim() === ''}
                                className="btn-primary flex items-center gap-2 py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50"
                            >
                                <CheckIcon className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Record'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <header className="space-y-6">
                <div className="flex items-center flex-wrap gap-2">
                    <span className="bg-accent-500/20 text-accent-400 px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border border-accent-500/30">
                        {article.category}
                    </span>
                    {article.tags.map(tag => (
                        <span key={tag} className="bg-white/5 text-gray-400 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase flex items-center gap-1 border border-white/10">
                            <TagIcon className="w-3 h-3" />#{tag}
                        </span>
                    ))}
                </div>

                <div className="space-y-6">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                        {article.title}
                    </h1>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-y border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm font-bold text-gray-300 shadow-inner">
                                {article.authorName?.[0] ?? 'A'}
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Authenticated by</div>
                                <div className="text-sm font-medium text-white">{article.authorName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {new Date(article.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Article content */}
            <article className={`bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all ${isEditing ? 'ring-2 ring-accent-500/50' : ''}`}>
                {isEditing ? (
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-[500px] bg-transparent text-gray-300 font-mono text-sm leading-relaxed outline-none resize-none no-scrollbar"
                        placeholder="Start typing markdown content..."
                    />
                ) : (
                    renderContent(article.content)
                )}
            </article>

            {showHistoryModal && user && (
                <WikiHistoryModal
                    articleId={articleId}
                    currentContent={article.content}
                    onClose={() => {
                        setShowHistoryModal(false);
                        loadArticle(); // Reload to get potential restored content
                    }}
                    user={{ uid: user.uid, displayName: user.displayName }}
                />
            )}
        </div>
    );
}
