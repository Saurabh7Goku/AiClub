'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    PencilIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    CursorArrowRaysIcon,
    SwatchIcon
} from '@heroicons/react/24/outline';
import { subscribeToMeetingCanvas, updateMeetingCanvas } from '@/lib/firebase/firestore';
import { CanvasPath, MeetingCanvas as MeetingCanvasType } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface MeetingCanvasProps {
    meetingId: string;
}

export default function MeetingCanvas({ meetingId }: MeetingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#f59e0b'); // Default to amber to match the new theme
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Remote state
    const [paths, setPaths] = useState<CanvasPath[]>([]);
    
    // Local state for the path currently being drawn
    const currentPathRef = useRef<{ x: number, y: number }[]>([]);

    useEffect(() => {
        const unsub = subscribeToMeetingCanvas(meetingId, (canvas) => {
            if (canvas) {
                setPaths(canvas.paths);
            } else {
                setPaths([]);
            }
        });
        return () => unsub();
    }, [meetingId]);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset background - matched to meeting room aesthetic
        const bg = isLight ? '#ffffff' : '#050505';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw all remote paths
        paths.forEach(p => {
            if (p.path.length < 1) return;
            ctx.beginPath();
            ctx.moveTo(p.path[0].x, p.path[0].y);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = p.tool === 'eraser' ? bg : (isLight && p.color === '#ffffff' ? '#111111' : p.color);
            ctx.lineWidth = p.tool === 'eraser' ? 20 : 3;
            
            for (let i = 1; i < p.path.length; i++) {
                ctx.lineTo(p.path[i].x, p.path[i].y);
            }
            ctx.stroke();
        });

        // Draw current local path
        const currentPath = currentPathRef.current;
        if (currentPath.length > 0) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = tool === 'eraser' ? bg : (isLight && color === '#ffffff' ? '#111111' : color);
            ctx.lineWidth = tool === 'eraser' ? 20 : 3;
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
        }
    }, [paths, tool, color, isLight]);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                redrawCanvas();
            }
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [redrawCanvas]);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        setIsDrawing(true);
        currentPathRef.current = [{ x, y }];
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        currentPathRef.current.push({ x, y });
        redrawCanvas();
    };

    const stopDrawing = async () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const newPath: CanvasPath = {
            tool,
            color,
            path: [...currentPathRef.current]
        };

        currentPathRef.current = []; // Reset local
        
        // Optimistically update
        const updatedPaths = [...paths, newPath];
        setPaths(updatedPaths);

        try {
            await updateMeetingCanvas(meetingId, updatedPaths);
        } catch (error) {
            console.error("Failed to sync drawing", error);
        }
    };

    const clearCanvas = async () => {
        setPaths([]);
        try {
            await updateMeetingCanvas(meetingId, []);
        } catch (error) {
            console.error("Failed to clear board", error);
        }
    };

    const downloadBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `meeting-board-${meetingId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative rounded-[2rem] border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {/* Toolbar */}
            <div className="absolute top-6 left-6 flex flex-col gap-3 z-10">
                <div className="bg-card opacity-90 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col gap-1.5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <ToolbarButton active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={PencilIcon} label="Draw" />
                    <ToolbarButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={TrashIcon} label="Erase" />
                </div>

                <div className="bg-card opacity-90 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] items-center">
                    {['#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); setTool('pencil'); }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-accent-500 scale-125 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20 hover:scale-110 hover:border-white/50'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="absolute top-6 right-6 flex gap-3 z-10">
                <button
                    onClick={clearCanvas}
                    className="bg-card opacity-80 backdrop-blur-md border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95 text-gray-400 hover:text-white"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={downloadBoard}
                    className="bg-accent-500 border border-accent-500/50 rounded-xl p-3 hover:bg-accent-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 text-black"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Canvas Area */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`flex-1 cursor-crosshair touch-none ${!isLight ? 'mix-blend-screen' : ''}`}
            />

            {/* Status Footer */}
            <div className="bg-card opacity-90 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 absolute bottom-0 left-0 right-0 z-10">
                <div className="flex items-center gap-2">
                    <CursorArrowRaysIcon className="w-3.5 h-3.5 text-accent-500" />
                    Canvas Live: {meetingId}
                </div>
                <div className="flex items-center gap-2">
                    <SwatchIcon className="w-3.5 h-3.5" style={{ color: color === '#ffffff' ? '#9ca3af' : color }} />
                    {tool} mode | Share Screen
                </div>
            </div>
        </div>
    );
}

function ToolbarButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`p-2.5 rounded-xl transition-all group relative border ${active ? 'bg-accent-500/20 border-accent-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/20'}`}
        >
            <Icon className={`w-5 h-5 ${active ? 'text-accent-400' : 'text-gray-400 group-hover:text-white'}`} />
            <span className="absolute left-16 bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {label}
            </span>
        </button>
    );
}
