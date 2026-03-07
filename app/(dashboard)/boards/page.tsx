'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import CollaborativeBoard from '@/components/projects/CollaborativeBoard';
import { Square3Stack3DIcon, PlusIcon } from '@heroicons/react/24/outline';

const SHARED_BOARDS = [
    { id: 'main', name: 'Main Workspace', desc: 'General brainstorming and ideation' },
    { id: 'arch', name: 'Architecture Canvas', desc: 'System design and technical diagrams' },
    { id: 'roadmap', name: 'Product Roadmap', desc: 'Club quarterly planning and milestones' },
];

export default function BoardsPage() {
    const [activeBoard, setActiveBoard] = useState(SHARED_BOARDS[0]);

    return (
        <div className="max-w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 relative">
                    <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
                        Shared <span className="text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Boards</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-400 mt-2 relative z-10">Collaborative canvases for the whole club</p>
                </div>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">
                {/* Board selector */}
                <div className="lg:w-64 shrink-0 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 px-2">Boards</h3>
                    {SHARED_BOARDS.map(board => (
                        <button
                            key={board.id}
                            onClick={() => setActiveBoard(board)}
                            className={`w-full text-left p-5 rounded-[1.5rem] border transition-all ${activeBoard.id === board.id ? 'bg-accent-500/10 border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/40 backdrop-blur-md border-white/10 hover:border-white/30 hover:bg-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)]'}`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Square3Stack3DIcon className={`w-5 h-5 ${activeBoard.id === board.id ? 'text-accent-400' : 'text-gray-400'}`} />
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${activeBoard.id === board.id ? 'text-white' : 'text-gray-300'}`}>{board.name}</span>
                            </div>
                            <p className={`text-[10px] font-medium leading-relaxed ${activeBoard.id === board.id ? 'text-gray-300' : 'text-gray-500'}`}>{board.desc}</p>
                        </button>
                    ))}

                    <button className="w-full p-5 rounded-[1.5rem] border border-dashed border-white/20 hover:border-accent-500/50 hover:bg-accent-500/5 text-gray-400 hover:text-accent-400 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                        <PlusIcon className="w-4 h-4" /> New Board
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 min-w-0">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white mb-1">{activeBoard.name}</h2>
                            <p className="text-sm font-medium text-gray-400">{activeBoard.desc}</p>
                        </div>
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent-400 bg-accent-500/10 border border-accent-500/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Live Canvas
                        </span>
                    </div>
                    <CollaborativeBoard projectId={`club-board-${activeBoard.id}`} />
                </div>
            </div>
        </div>
    );
}
