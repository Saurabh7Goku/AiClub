'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface Message {
    role: 'user' | 'model';
    content: string;
}

interface MeetingAIAssistantProps {
    meetingId: string;
    getBoardText?: () => string;
    onSummaryGenerated?: (summaryText: string) => void;
}

export default function MeetingAIAssistant({
    meetingId,
    getBoardText,
    onSummaryGenerated,
}: MeetingAIAssistantProps) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            content: 'Hello! I\'m your AI Meeting Assistant. Discuss ideas, architecture, risks, or anything technical. How can I help?',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryDone, setSummaryDone] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = { role: 'user', content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);

        try {
            const boardContext = getBoardText?.() || '';
            const res = await fetch('/api/ai/meeting-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextMessages,
                    boardContext,
                    meetingId,
                }),
            });
            const data = await res.json();
            if (data.success && data.reply) {
                setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'model', content: '❌ Failed to get a response. Please try again.' },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'model', content: '❌ Network error. Please try again.' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const generateSummary = async () => {
        if (summaryLoading || messages.length < 2) return;
        setSummaryLoading(true);
        setSummaryDone(false);

        try {
            const boardContent = getBoardText?.() || '';
            const res = await fetch('/api/ai/meeting-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, boardContent }),
            });
            const data = await res.json();
            if (data.success && data.summary) {
                onSummaryGenerated?.(data.summary);
                setSummaryDone(true);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'model',
                        content: '✅ Summary notes generated and added to the board!',
                    },
                ]);
            } else {
                alert('Failed to generate summary. Please retry.');
            }
        } catch {
            alert('Network error while generating summary.');
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-accent-500 text-black font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 transition-all border border-accent-400/50"
                    title="AI Meeting Assistant — Discuss ideas, get specialist advice"
                >
                    <SparklesIcon className="w-5 h-5" />
                    Ask AI
                </button>
            )}

            {/* Sliding Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col bg-white dark:bg-[#050505] border-l border-white/10 shadow-[-10px_0px_40px_rgba(0,0,0,0.8)] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent-500/20 border border-accent-500/30 rounded-xl flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <SparklesIcon className="w-5 h-5 text-accent-400" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-[rgb(var(--foreground-rgb))] uppercase tracking-tight">AI Assistant</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Text Chat · Specialist Advice</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'user'
                                    ? 'bg-accent-500/15 border border-accent-500/30 text-[rgb(var(--foreground-rgb))] rounded-tr-sm shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                    : 'bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] rounded-tl-sm'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-3 bg-card border border-white/10 rounded-2xl rounded-tl-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Generate Summary button */}
                <div className="px-4 py-3 border-t border-white/5">
                    <button
                        type="button"
                        onClick={generateSummary}
                        disabled={summaryLoading || messages.length < 2}
                        className={`w-full py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${summaryDone
                            ? 'bg-accent-500/20 border-accent-500/30 text-accent-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {summaryLoading ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-accent-500 rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : summaryDone ? (
                            '✅ Summary Added to Board!'
                        ) : (
                            <>
                                <SparklesIcon className="w-3.5 h-3.5" />
                                Generate Summary Notes
                            </>
                        )}
                    </button>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center mt-1.5">
                        Adds structured notes to the collaborative board
                    </p>
                </div>

                {/* Input */}
                <div className="px-4 pb-4 pt-2 border-t border-white/10">
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about ideas, risks, architecture..."
                            rows={2}
                            className="flex-1 resize-none rounded-xl border border-white/10 focus:border-accent-500/50 outline-none px-4 py-3 text-sm font-medium text-[rgb(var(--foreground-rgb))] placeholder-gray-500 transition-colors bg-card focus:ring-1 focus:ring-accent-500/30"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            className="w-11 h-11 bg-accent-500 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            <PaperAirplaneIcon className="w-5 h-5 text-black" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
}
