import { useState } from 'react';
import { ChannelType } from '@/types';

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string, type: ChannelType) => Promise<void>;
}

export default function CreateChannelModal({ isOpen, onClose, onSubmit }: CreateChannelModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ChannelType>('text');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onSubmit(name.trim().toLowerCase().replace(/\s+/g, '-'), description.trim(), type);
            setName('');
            setDescription('');
            setType('text');
            onClose();
        } catch (error) {
            console.error("Error creating channel", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-black/90 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden backdrop-blur-xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center relative z-10">
                    <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span className="text-accent-500">⚡</span> Initialize Node
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                            Node Type
                        </label>
                        <div className="flex space-x-6">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={type === 'text'}
                                    onChange={() => setType('text')}
                                    className="w-4 h-4 text-accent-500 border border-white/20 focus:ring-accent-500 focus:ring-1 bg-white/5 accent-accent-500"
                                />
                                <span className="font-bold text-gray-300 group-hover:text-white transition-colors"># Comms</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={type === 'announcement'}
                                    onChange={() => setType('announcement')}
                                    className="w-4 h-4 text-accent-500 border border-white/20 focus:ring-accent-500 focus:ring-1 bg-white/5 accent-accent-500"
                                />
                                <span className="font-bold text-gray-300 group-hover:text-white transition-colors">📢 Transmission</span>
                            </label>
                        </div>
                        {type === 'announcement' && (
                            <p className="text-[11px] text-accent-400 mt-2 font-bold tracking-wide">Command level personnel only.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                            Node Identifier
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-accent-500 font-bold">#</span>
                            <input
                                type="text"
                                required
                                maxLength={30}
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                placeholder="e.g. general, algorithms"
                                className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 font-bold text-white transition-all font-mono shadow-inner placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                            Parameters <span className="text-[10px] text-gray-500 normal-case font-bold">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            maxLength={100}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this node's purpose?"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 font-bold text-white transition-all shadow-inner placeholder:text-gray-600"
                        />
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-white/10 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 font-bold text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-widest"
                            disabled={loading}
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="btn-primary py-2.5 px-8 disabled:opacity-50 disabled:grayscale flex items-center text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98]"
                        >
                            {loading ? 'Initializing...' : 'Construct'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
