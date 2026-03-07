'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    joinVideoRoom,
    leaveVideoRoom,
    updateParticipantMedia,
    onSignal,
    onParticipantsChanged,
    destroyVideoRoom,
} from '@/lib/webrtc/signaling';
import {
    createPeerConnection,
    addLocalStream,
    createAndSendOffer,
    handleOffer,
    handleAnswer,
    handleICECandidate,
    closePeerConnection,
    replaceTrack,
    getLocalStream,
    getScreenStream,
    stopStream,
} from '@/lib/webrtc/peerConnection';
import { VideoParticipant, RTCSignal } from '@/types';

interface VideoConferenceProps {
    meetingId: string;
    user: { uid: string; displayName: string };
    isAdmin: boolean;
}

export default function VideoConference({ meetingId, user, isAdmin }: VideoConferenceProps) {
    const [joined, setJoined] = useState(false);
    const [participants, setParticipants] = useState<Record<string, VideoParticipant>>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideosRef = useRef<Record<string, HTMLVideoElement | null>>({});
    const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
    const cleanupRef = useRef<(() => void)[]>([]);

    // Join the video room
    const handleJoin = useCallback(async () => {
        setConnectionError(null);
        try {
            const stream = await getLocalStream(true, true);
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            joinVideoRoom(meetingId, {
                uid: user.uid,
                displayName: user.displayName,
                hasVideo: true,
                hasAudio: true,
                isScreenSharing: false,
                joinedAt: Date.now(),
            });

            setJoined(true);
        } catch (err: any) {
            console.error('Failed to join video:', err);
            setConnectionError(
                err.name === 'NotAllowedError'
                    ? 'Camera/microphone permission denied. Please allow access and try again.'
                    : 'Failed to access media devices. Please check your camera and microphone.'
            );
        }
    }, [meetingId, user]);

    // Leave the video room
    const handleLeave = useCallback(() => {
        // Close all peer connections
        Object.entries(peerConnectionsRef.current).forEach(([uid, pc]) => {
            closePeerConnection(pc);
        });
        peerConnectionsRef.current = {};

        // Clean up signal/participant listeners
        cleanupRef.current.forEach((cleanup) => cleanup());
        cleanupRef.current = [];

        // Stop local streams
        stopStream(localStream);
        stopStream(screenStream);

        // Remove from video room
        leaveVideoRoom(meetingId, user.uid);

        setLocalStream(null);
        setScreenStream(null);
        setJoined(false);
        setParticipants({});
        setIsScreenSharing(false);
        setIsMuted(false);
        setIsCameraOff(false);
    }, [meetingId, user.uid, localStream, screenStream]);

    // Set up local video srcObject
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Handle incoming signals and participant changes
    useEffect(() => {
        if (!user.uid) return;

        console.log('Initializing signaling listeners...');

        // Listen for incoming signals addressed to me
        const unsubSignals = onSignal(meetingId, user.uid, async (signal: RTCSignal) => {
            try {
                let pc = peerConnectionsRef.current[signal.from];

                if (signal.type === 'offer') {
                    console.log(`Received offer from ${signal.from}`);
                    if (!pc) {
                        pc = createPeerConnection(meetingId, user.uid, signal.from, {
                            onTrack: (event) => {
                                console.log(`Received track from ${signal.from}`);
                                const videoEl = remoteVideosRef.current[signal.from];
                                if (videoEl && event.streams[0]) {
                                    videoEl.srcObject = event.streams[0];
                                }
                            },
                            onConnectionStateChange: (state) => {
                                console.log(`Connection to ${signal.from}: ${state}`);
                                if (state === 'disconnected' || state === 'failed') {
                                    closePeerConnection(pc);
                                    delete peerConnectionsRef.current[signal.from];
                                }
                            },
                            onICEConnectionStateChange: () => { },
                        });

                        // Add my local stream if I have one
                        if (localStream) {
                            addLocalStream(pc, localStream);
                        }
                        peerConnectionsRef.current[signal.from] = pc;
                    }
                    await handleOffer(pc, meetingId, user.uid, signal.from, signal.data);
                } else if (signal.type === 'answer' && pc) {
                    console.log(`Received answer from ${signal.from}`);
                    await handleAnswer(pc, signal.data);
                } else if (signal.type === 'candidate' && pc) {
                    await handleICECandidate(pc, signal.data);
                }
            } catch (err) {
                console.error('Signal handling error:', err);
            }
        });

        // Listen for participant changes
        const unsubParticipants = onParticipantsChanged(meetingId, {
            onJoin: async (uid, participant) => {
                if (uid === user.uid) return;
                console.log(`Participant joined: ${uid} (${participant.displayName})`);

                // If I'm already joined and have a stream, I'll initiate the connection to the new person
                if (joined && localStream && !peerConnectionsRef.current[uid]) {
                    const pc = createPeerConnection(meetingId, user.uid, uid, {
                        onTrack: (event) => {
                            console.log(`Received track from ${uid} (as offerer)`);
                            const videoEl = remoteVideosRef.current[uid];
                            if (videoEl && event.streams[0]) {
                                videoEl.srcObject = event.streams[0];
                            }
                        },
                        onConnectionStateChange: (state) => {
                            console.log(`Connection to ${uid}: ${state}`);
                            if (state === 'disconnected' || state === 'failed') {
                                closePeerConnection(pc);
                                delete peerConnectionsRef.current[uid];
                            }
                        },
                        onICEConnectionStateChange: () => { },
                    });
                    addLocalStream(pc, localStream);
                    peerConnectionsRef.current[uid] = pc;
                    await createAndSendOffer(pc, meetingId, user.uid, uid);
                }
            },
            onLeave: (uid) => {
                console.log(`Participant left: ${uid}`);
                const pc = peerConnectionsRef.current[uid];
                if (pc) {
                    closePeerConnection(pc);
                    delete peerConnectionsRef.current[uid];
                }
            },
            onUpdate: (allParticipants) => {
                setParticipants(allParticipants);
            },
        });

        return () => {
            unsubSignals();
            unsubParticipants();
        };
    }, [meetingId, user.uid, joined, localStream]); // Dependencies ensure logic updates when I join/get stream

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (joined) {
                handleLeave();
            }
        };
    }, []);

    // Toggle microphone
    const toggleMic = useCallback(() => {
        if (localStream) {
            const newMuted = !isMuted;
            localStream.getAudioTracks().forEach((track) => {
                track.enabled = !newMuted;
            });
            setIsMuted(newMuted);
            updateParticipantMedia(meetingId, user.uid, { hasAudio: !newMuted });
        }
    }, [localStream, isMuted, meetingId, user.uid]);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        if (localStream) {
            const newCameraOff = !isCameraOff;
            localStream.getVideoTracks().forEach((track) => {
                track.enabled = !newCameraOff;
            });
            setIsCameraOff(newCameraOff);
            updateParticipantMedia(meetingId, user.uid, { hasVideo: !newCameraOff });
        }
    }, [localStream, isCameraOff, meetingId, user.uid]);

    // Toggle screen sharing
    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // Revert to camera track for all peers
            if (localStream) {
                const cameraTrack = localStream.getVideoTracks()[0];
                if (cameraTrack) {
                    Object.values(peerConnectionsRef.current).forEach((pc) => {
                        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(cameraTrack);
                        }
                    });
                }
            }
            stopStream(screenStream);
            setScreenStream(null);
            setIsScreenSharing(false);
            updateParticipantMedia(meetingId, user.uid, { isScreenSharing: false });
        } else {
            try {
                const screen = await getScreenStream();
                setScreenStream(screen);
                setIsScreenSharing(true);
                updateParticipantMedia(meetingId, user.uid, { isScreenSharing: true });

                // Replace camera track with screen track on all peer connections
                const screenTrack = screen.getVideoTracks()[0];
                if (screenTrack) {
                    Object.values(peerConnectionsRef.current).forEach((pc) => {
                        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(screenTrack);
                        }
                    });
                }

                // When user clicks "Stop sharing" in browser chrome
                screen.getVideoTracks()[0].onended = () => {
                    // Revert to camera track
                    if (localStream) {
                        const cameraTrack = localStream.getVideoTracks()[0];
                        if (cameraTrack) {
                            Object.values(peerConnectionsRef.current).forEach((pc) => {
                                const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                                if (sender) {
                                    sender.replaceTrack(cameraTrack);
                                }
                            });
                        }
                    }
                    setScreenStream(null);
                    setIsScreenSharing(false);
                    updateParticipantMedia(meetingId, user.uid, { isScreenSharing: false });
                };
            } catch (err) {
                console.error('Screen share failed:', err);
            }
        }
    }, [isScreenSharing, screenStream, localStream, meetingId, user.uid]);

    const remoteParticipants = Object.entries(participants).filter(([uid]) => uid !== user.uid);
    const totalParticipants = remoteParticipants.length + 1; // +1 for local

    // Grid layout
    const getGridCols = () => {
        if (totalParticipants <= 1) return 'grid-cols-1';
        if (totalParticipants <= 4) return 'grid-cols-2';
        if (totalParticipants <= 9) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    // ==================== NOT JOINED VIEW ====================
    if (!joined) {
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">Video Conference</h3>
                    <p className="text-gray-400 text-sm font-medium max-w-sm">
                        Join the video call to collaborate face-to-face with other operatives.
                    </p>
                </div>

                {connectionError && (
                    <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg max-w-sm text-center">
                        {connectionError}
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    className="btn-primary px-8 py-3 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Join Video Call
                </button>
            </div>
        );
    }

    // ==================== JOINED VIEW ====================
    return (
        <div className="space-y-4">
            {/* Video Grid */}
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {/* Screen Share Overlay */}
                {screenStream && (
                    <div className="relative w-full aspect-video bg-black border-b border-white/10">
                        <video
                            autoPlay
                            playsInline
                            ref={(el) => {
                                if (el) el.srcObject = screenStream;
                            }}
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                                You are sharing your screen
                            </span>
                        </div>
                    </div>
                )}

                <div className={`grid ${getGridCols()} gap-1 p-2`}>
                    {/* Local Video */}
                    <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden group">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
                        />
                        {isCameraOff && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                <div className="w-14 h-14 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                                    <span className="text-accent-500 font-bold text-lg uppercase">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                                You{isMuted ? ' • Muted' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {remoteParticipants.map(([uid, participant]) => (
                        <div key={uid} className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                            <video
                                ref={(el) => {
                                    remoteVideosRef.current[uid] = el;
                                }}
                                autoPlay
                                playsInline
                                className={`w-full h-full object-cover ${!participant.hasVideo ? 'hidden' : ''}`}
                            />
                            {!participant.hasVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="w-14 h-14 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                                        <span className="text-accent-500 font-bold text-lg uppercase">
                                            {participant.displayName?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                                    {participant.displayName}
                                    {!participant.hasAudio ? ' • Muted' : ''}
                                </span>
                                {participant.isScreenSharing && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-accent-400 bg-accent-500/10 border border-accent-500/20 px-2 py-0.5 rounded-md">
                                        Sharing
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-center gap-3">
                    {/* Mic Toggle */}
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isMuted
                            ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                            }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5m14 0v4a3 3 0 01-5.356 1.857M17 8a5 5 0 00-7.54-4.32M5 8a5 5 0 004 4.9V17H6a1 1 0 000 2h8a1 1 0 100-2h-3v-2.07" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>

                    {/* Camera Toggle */}
                    <button
                        onClick={toggleCamera}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isCameraOff
                            ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                            }`}
                        title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                        {isCameraOff ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 0A9 9 0 015.636 18.364" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        )}
                    </button>

                    {/* Screen Share */}
                    <button
                        onClick={toggleScreenShare}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isScreenSharing
                            ? 'bg-accent-500/20 border border-accent-500/30 text-accent-400 hover:bg-accent-500/30'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                            }`}
                        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                        </svg>
                    </button>

                    {/* Participant Count */}
                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                            {totalParticipants}
                        </span>
                    </div>

                    {/* Leave Button */}
                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                    <button
                        onClick={handleLeave}
                        className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}
