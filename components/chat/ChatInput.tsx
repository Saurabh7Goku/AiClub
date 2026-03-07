'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import PollCreatorModal from './PollCreatorModal';
import { PollData, MessageAttachment } from '@/types';
import { PaperClipIcon, XMarkIcon, CloudIcon } from '@heroicons/react/24/outline';

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface ChatInputProps {
    onSendMessage: (content: string, richText: string, type?: 'text' | 'poll', pollData?: PollData, attachments?: MessageAttachment[]) => Promise<void>;
    placeholder?: string;
}

export default function ChatInput({ onSendMessage, placeholder = 'Type a message...' }: ChatInputProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Attachments state
    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [showAttachmentInput, setShowAttachmentInput] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [attachmentName, setAttachmentName] = useState('');

    // Mentions state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');

    // Polls state
    const [showPollCreator, setShowPollCreator] = useState(false);

    const MOCK_MENTIONS = ['everyone', 'here', 'admin', 'moderator', 'member'];

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const handleSend = async () => {
        const plainText = content.replace(/<[^>]*>?/gm, '').trim();
        if (!plainText && !content.includes('<img') && attachments.length === 0) return;

        setLoading(true);
        try {
            await onSendMessage(plainText, content, 'text', undefined, attachments);
            setContent('');
            setAttachments([]);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const addAttachment = () => {
        if (!attachmentUrl || !attachmentName) return;
        const newAttachment: MessageAttachment = {
            url: attachmentUrl,
            name: attachmentName,
            type: 'onedrive', // Default to onedrive for now as per requirements
            size: 0
        };
        setAttachments([...attachments, newAttachment]);
        setAttachmentUrl('');
        setAttachmentName('');
        setShowAttachmentInput(false);
    };

    return (
        <div className="bg-transparent p-1 shrink-0 flex flex-col gap-2 relative z-10 w-full transition-all duration-300">
            {/* Attachment Display - Floating Badges */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {attachments.map((at, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-accent-500/10 border border-accent-500/20 px-3 py-1.5 rounded-xl shadow-lg group hover:border-accent-500/40 transition-all">
                            <CloudIcon className="w-3.5 h-3.5 text-accent-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--foreground-rgb))] truncate max-w-[150px]">{at.name}</span>
                            <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-red-500 transition-colors">
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Bar / Toolbar Extras - Subtle & Sophisticated */}
            <div className="flex items-center space-x-3 px-2 z-10">
                <button
                    onClick={() => setShowPollCreator(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-background hover:bg-accent-500/10 text-gray-500 hover:text-accent-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 hover:border-accent-500/30 shadow-sm"
                    title="Create a Poll"
                >
                    <span className="text-sm">📊</span> <span>Poll</span>
                </button>
                <button
                    onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${showAttachmentInput ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-background border-white/5 text-gray-500 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30'}`}
                    title="Attach OneDrive File"
                >
                    <PaperClipIcon className="w-3.5 h-3.5" /> <span>OneDrive</span>
                </button>
                
                <div className="flex-1" />
                
                <span className="hidden sm:inline text-[8px] font-bold text-gray-500 uppercase tracking-widest opacity-40">
                    Press Enter to Transmit
                </span>
            </div>

            {/* Attachment Input Popover - Solid */}
            {showAttachmentInput && (
                <div className="absolute bottom-full mb-6 left-2 p-5 bg-white dark:bg-gray-950 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 w-80 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Mount Cloud Sector</h4>
                        </div>
                        <button onClick={() => setShowAttachmentInput(false)} className="hover:rotate-90 transition-transform"><XMarkIcon className="w-4 h-4 text-gray-500" /></button>
                    </div>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="File Name..."
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-[11px] text-[rgb(var(--foreground-rgb))] font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600 shadow-inner"
                        />
                        <input
                            type="url"
                            placeholder="OneDrive Link (https://...)"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-[11px] text-[rgb(var(--foreground-rgb))] font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={addAttachment}
                        disabled={!attachmentUrl || !attachmentName}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-30 disabled:grayscale disabled:shadow-none"
                    >
                        Sync Attachment
                    </button>
                    <div className="absolute top-full left-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[rgb(var(--card-bg))]"></div>
                </div>
            )}

            <div className="border border-white/10 rounded-2xl overflow-hidden focus-within:border-accent-500/50 focus-within:ring-2 focus-within:ring-accent-500/20 transition-all bg-background flex flex-col relative text-[rgb(var(--foreground-rgb))] shadow-inner group">
                <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={(val) => {
                        setContent(val);
                        const match = val.match(/@(\w*)$/);
                        if (match) {
                            setShowMentions(true);
                            setMentionFilter(match[1].toLowerCase());
                        } else {
                            setShowMentions(false);
                        }
                    }}
                    modules={modules}
                    placeholder={placeholder}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent message-editor max-h-60 overflow-y-auto"
                />

                {/* Send Button overlapping at bottom right - Floating Circle */}
                <div className="absolute bottom-2.5 right-2.5">
                    <button
                        onClick={handleSend}
                        disabled={loading || (!content.trim() && !content.includes('<img') && attachments.length === 0)}
                        className="w-10 h-10 rounded-full bg-accent-500 text-black shadow-lg flex items-center justify-center hover:bg-accent-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group z-10"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mentions Dropdown - Solid */}
            {showMentions && (
                <div className="absolute bottom-full mb-3 left-2 w-56 bg-white dark:bg-gray-950 border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="px-4 py-2 border-b border-dashed border-white/10 bg-white/[0.03] flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Identify Component</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                    </div>
                    <div className="max-h-52 overflow-y-auto custom-scrollbar p-1.5">
                        {MOCK_MENTIONS.filter(m => m.includes(mentionFilter)).map(m => (
                            <button
                                key={m}
                                onClick={() => {
                                    setContent(content.replace(/@(\w*)$/, `@${m}&nbsp;`));
                                    setShowMentions(false);
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-accent-500/10 hover:text-accent-500 rounded-xl transition-all flex items-center gap-3"
                            >
                                <div className="w-6 h-6 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-[10px]">@</div>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style jsx global>{`
        .message-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 10px 16px;
          background: rgba(255,255,255,0.01);
          display: flex;
          gap: 4px;
        }
        .message-editor .ql-toolbar button {
          color: #6b7280 !important;
          border-radius: 6px !important;
          width: 28px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
        }
        .message-editor .ql-toolbar button:hover {
          color: #10b981 !important;
          background: rgba(16,185,129,0.1) !important;
        }
        .message-editor .ql-toolbar .ql-active {
            color: #10b981 !important;
            background: rgba(16,185,129,0.1) !important;
        }
        .message-editor .ql-toolbar .ql-stroke {
          stroke: currentColor;
          stroke-width: 2px;
        }
        .message-editor .ql-toolbar .ql-fill {
          fill: currentColor;
        }
        .message-editor .ql-container {
          border: none;
          font-family: inherit;
          font-size: 0.9rem;
          color: rgb(var(--foreground-rgb));
        }
        .message-editor .ql-editor {
          min-height: 48px;
          padding: 14px 16px 40px 16px;
          line-height: 1.6;
          font-weight: 500;
        }
        .message-editor .ql-editor.ql-blank::before {
          color: #4b5563;
          font-style: normal;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          left: 16px;
        }
        .message-editor .ql-editor p {
          margin-bottom: 0.5em;
        }
      `}</style>
            <PollCreatorModal
                isOpen={showPollCreator}
                onClose={() => setShowPollCreator(false)}
                onSubmit={async (pollData) => {
                    await onSendMessage('Created a poll.', '', 'poll', pollData);
                }}
            />
        </div>
    );
}
