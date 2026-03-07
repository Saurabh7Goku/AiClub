'use client';

import { useEffect, useRef } from 'react';

interface ScreenShareProps {
    stream: MediaStream;
    presenterName: string;
    isLocal: boolean;
    onStopSharing?: () => void;
}

/**
 * Full-width screen share display with presenter info and stop control.
 */
export default function ScreenShare({
    stream,
    presenterName,
    isLocal,
    onStopSharing,
}: ScreenShareProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className="w-full max-h-[70vh] object-contain"
            />

            {/* Presenter label */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                    {isLocal ? 'You are' : `${presenterName} is`} sharing screen
                </span>
            </div>

            {/* Stop button for local user */}
            {isLocal && onStopSharing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <button
                        onClick={onStopSharing}
                        className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Stop Sharing
                    </button>
                </div>
            )}
        </div>
    );
}
