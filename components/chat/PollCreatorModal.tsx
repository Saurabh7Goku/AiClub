import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PollData, PollOption } from '@/types';

interface PollCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pollData: PollData) => void;
}

export default function PollCreatorModal({ isOpen, onClose, onSubmit }: PollCreatorModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleAddOption = () => {
        if (options.length >= 10) return;
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validOptions = options.filter(o => o.trim());
        if (!question.trim() || validOptions.length < 2) return;

        const pollOptions: PollOption[] = validOptions.map((text, i) => ({
            id: `opt-${Date.now()}-${i}`,
            text: text.trim(),
            votes: [],
        }));

        onSubmit({
            question: question.trim(),
            allowMultiple,
            options: pollOptions,
            closed: false,
        });

        // Reset
        setQuestion('');
        setOptions(['', '']);
        setAllowMultiple(false);
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-black/90 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden backdrop-blur-2xl relative flex flex-col max-h-[85vh]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center relative z-10 shrink-0">
                    <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span className="text-accent-500">📊</span> Construct Protocol
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 relative z-10 overflow-hidden flex-1">
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                                Poll Question
                            </label>
                            <input
                                type="text"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Poll question..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 font-bold text-white transition-all shadow-inner placeholder:text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                                Poll Options
                            </label>
                            <div className="space-y-3">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center space-x-3">
                                        <input
                                            type="text"
                                            required={i < 2}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`Option [${i + 1}]`}
                                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 font-bold text-white transition-all shadow-inner placeholder:text-gray-600 font-mono text-sm"
                                        />
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(i)}
                                                className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/30 shrink-0"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {options.length < 10 && (
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="mt-4 text-[11px] font-bold text-accent-500 hover:text-accent-400 uppercase tracking-widest flex items-center transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Option
                                </button>
                            )}
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center space-x-3 cursor-pointer group w-fit">
                                <input
                                    type="checkbox"
                                    checked={allowMultiple}
                                    onChange={(e) => setAllowMultiple(e.target.checked)}
                                    className="w-4 h-4 text-accent-500 border border-white/20 rounded focus:ring-accent-500 focus:ring-1 bg-white/5 accent-accent-500"
                                />
                                <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Permit multiple selections</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 p-6 border-t border-white/10 bg-white/5 shrink-0 mt-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 font-bold text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-widest"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                            className="btn-primary py-2.5 px-8 disabled:opacity-50 disabled:grayscale flex items-center text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98]"
                        >
                            Submit Poll
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
