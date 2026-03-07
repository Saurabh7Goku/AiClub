'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import {
    subscribeToWikiArticles,
    createWikiArticle,
    notifyClubMembers,
    WikiArticle
} from '@/lib/firebase/firestore';
import {
    BookOpenIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    FolderIcon,
    ClockIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const WIKI_CATEGORIES = ['Research Protocols', 'Machine Learning', 'Neural Networks', 'Club Governance', 'Tutorials', 'Tools & Infra', 'General'];

export default function WikiPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentClub } = useClub();
    const [articles, setArticles] = useState<WikiArticle[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showNewModal, setShowNewModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // New Article form state
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState(WIKI_CATEGORIES[0]);
    const [newTags, setNewTags] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!currentClub) return;
        const unsub = subscribeToWikiArticles(currentClub.id, (data) => {
            setArticles(data);
            setLoading(false);
        });
        return () => unsub();
    }, [currentClub]);

    const filteredArticles = articles.filter(a => {
        const matchesSearch = !search ||
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.content.toLowerCase().includes(search.toLowerCase()) ||
            a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categoryCounts = WIKI_CATEGORIES.map(cat => ({
        name: cat,
        count: articles.filter(a => a.category === cat).length
    }));

    const handleCreateArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim() || !user || !currentClub) return;
        setCreating(true);
        try {
            const id = await createWikiArticle({
                clubId: currentClub.id,
                title: newTitle,
                content: newContent,
                category: newCategory,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
            });
            // Notify all club members
            notifyClubMembers(
                currentClub.id, user.uid, user.displayName || 'A member',
                'new_wiki', `New Wiki Article: ${newTitle}`,
                `${user.displayName || 'Someone'} published a new wiki article: "${newTitle}"`,
                { actionUrl: `/wiki/${id}` }
            );
            setShowNewModal(false);
            setNewTitle(''); setNewContent(''); setNewTags('');
            router.push(`/wiki/${id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none uppercase">
                        Knowledge <span className="text-accent-500">Wiki</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-400 mt-2">{articles.length} authenticated records · Node {currentClub?.name}</p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="btn-primary py-3 px-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all"
                >
                    <PlusIcon className="w-4 h-4" /> Initialize Record
                </button>
            </div>

            {/* Search + Filter Row */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Query database records, tags..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-[14px] font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                    />
                </div>
                <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[1.25rem] shadow-[0_0_20px_rgba(0,0,0,0.5)] h-fit items-center">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategory === 'all' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >All</button>
                    {WIKI_CATEGORIES.slice(0, 4).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat === selectedCategory ? 'all' : cat)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >{cat}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Categories sidebar */}
                <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500 opacity-80 px-2">Taxonomy</h3>
                    <div className="space-y-2">
                        {categoryCounts.map(cat => (
                            <button
                                key={cat.name}
                                onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'all' : cat.name)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedCategory === cat.name ? 'bg-accent-500/10 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-accent-400' : 'bg-black/40 backdrop-blur-md border-white/5 hover:border-accent-500/30 text-gray-400 hover:bg-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.5)]'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <FolderIcon className={`w-4 h-4 ${selectedCategory === cat.name ? 'text-accent-400' : 'text-gray-500'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedCategory === cat.name ? 'text-accent-400' : 'text-gray-300'}`}>{cat.name}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${selectedCategory === cat.name ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-white/10 border border-white/5 text-gray-400'}`}>{cat.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Article list */}
                <div className="lg:col-span-3 space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-[2rem] animate-pulse" />)}
                        </div>
                    ) : filteredArticles.length === 0 ? (
                        <div className="bg-black/40 backdrop-blur-xl border border-dashed border-white/20 rounded-[2.5rem] p-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-5">
                                <BookOpenIcon className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">
                                {search ? 'No Match Found' : 'Empty Database'}
                            </h3>
                            <p className="text-sm text-gray-400 mt-2 max-w-sm">
                                {search ? 'Adjust your query parameters' : 'Be the first to initialize a knowledge record in this cluster.'}
                            </p>
                            {!search && (
                                <button onClick={() => setShowNewModal(true)} className="mt-6 text-accent-400 font-bold text-xs uppercase tracking-widest hover:text-accent-300 transition-colors">
                                    Initialize First Record
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-elevator-in">
                            {filteredArticles.map(article => (
                                <button
                                    key={article.id}
                                    onClick={() => router.push(`/wiki/${article.id}`)}
                                    className="w-full text-left bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:bg-white/5 hover:border-white/20 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(0,0,0,0.8)] group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-3xl rounded-full group-hover:bg-accent-500/10 transition-colors"></div>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                <span className="bg-white/10 border border-white/5 text-gray-300 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest">{article.category}</span>
                                                {article.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-gray-500 px-2 text-[10px] uppercase font-bold tracking-widest leading-none">#{tag}</span>
                                                ))}
                                            </div>
                                            <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight group-hover:text-accent-400 transition-colors line-clamp-2">{article.title}</h2>
                                            <p className="text-[13px] text-gray-400 font-medium mt-3 line-clamp-2 leading-relaxed">{article.content.replace(/^#+\s*/gm, '').substring(0, 150)}…</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-4 sm:flex-col sm:items-end">
                                            <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest">
                                                <ClockIcon className="w-3.5 h-3.5" />
                                                {new Date(article.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-gray-300 text-[8px] font-bold border border-white/5">
                                                    {article.authorName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{article.authorName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* New Article Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-elevator-in">
                    <div className="bg-gray-900 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
                            <h2 className="text-2xl font-extrabold tracking-tight text-white uppercase">Initialize Record</h2>
                            <button onClick={() => setShowNewModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateArticle} className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Designation *</label>
                                    <input
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="Title of the research document..."
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 shadow-inner transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Taxonomy</label>
                                    <select
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 shadow-inner transition-all [&>option]:bg-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat"
                                    >
                                        {WIKI_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Indexing Tags</label>
                                    <input
                                        value={newTags}
                                        onChange={e => setNewTags(e.target.value)}
                                        placeholder="e.g. pytorch, agents..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 shadow-inner transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2 mt-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Content * <span className="text-gray-600 ml-1">(Markdown supported)</span></label>
                                    <textarea
                                        value={newContent}
                                        onChange={e => setNewContent(e.target.value)}
                                        placeholder="## Overview&#10;Input intelligence data here..."
                                        required
                                        rows={10}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-medium text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 shadow-inner transition-all resize-none leading-relaxed"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    type="submit"
                                    disabled={creating || !newTitle.trim() || !newContent.trim()}
                                    className="w-full btn-primary py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50 flex justify-center items-center"
                                >
                                    {creating ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Writing to Database...
                                        </div>
                                    ) : 'Publish Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
