'use client';

import { sendSignal } from './signaling';
import { RTCSignal } from '@/types';

// Free Google STUN servers + public TURN fallbacks
const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
];

const RTC_CONFIG: RTCConfiguration = {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
};

// ==================== MEDIA STREAMS ====================

/**
 * Get the user's local audio/video stream
 */
export async function getLocalStream(
    video: boolean = true,
    audio: boolean = true
): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
        video: video
            ? {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
            }
            : false,
        audio: audio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            }
            : false,
    });
}

/**
 * Get a screen share stream
 */
export async function getScreenStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
    });
}

// ==================== PEER CONNECTION ====================

export interface PeerConnectionCallbacks {
    onTrack: (event: RTCTrackEvent) => void;
    onConnectionStateChange: (state: RTCPeerConnectionState) => void;
    onICEConnectionStateChange: (state: RTCIceConnectionState) => void;
}

/**
 * Create a new RTCPeerConnection with ICE candidate handling
 */
export function createPeerConnection(
    meetingId: string,
    localUid: string,
    remoteUid: string,
    callbacks: PeerConnectionCallbacks
): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Send ICE candidates through the signaling channel
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal(meetingId, {
                type: 'candidate',
                from: localUid,
                to: remoteUid,
                data: event.candidate.toJSON(),
                timestamp: Date.now(),
            });
        }
    };

    pc.ontrack = callbacks.onTrack;

    pc.onconnectionstatechange = () => {
        callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
        callbacks.onICEConnectionStateChange(pc.iceConnectionState);
    };

    return pc;
}

/**
 * Add a local media stream to a peer connection
 */
export function addLocalStream(pc: RTCPeerConnection, stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
    });
}

/**
 * Replace a specific track (e.g., when toggling camera or switching to screen share)
 */
export function replaceTrack(
    pc: RTCPeerConnection,
    oldTrack: MediaStreamTrack,
    newTrack: MediaStreamTrack
): void {
    const sender = pc.getSenders().find((s) => s.track === oldTrack);
    if (sender) {
        sender.replaceTrack(newTrack);
    }
}

// ==================== SDP NEGOTIATION ====================

/**
 * Create an SDP offer and send it via the signaling channel
 */
export async function createAndSendOffer(
    pc: RTCPeerConnection,
    meetingId: string,
    localUid: string,
    remoteUid: string
): Promise<void> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(meetingId, {
        type: 'offer',
        from: localUid,
        to: remoteUid,
        data: { sdp: offer.sdp, type: offer.type },
        timestamp: Date.now(),
    });
}

/**
 * Handle an incoming SDP offer — set remote description and create answer
 */
export async function handleOffer(
    pc: RTCPeerConnection,
    meetingId: string,
    localUid: string,
    remoteUid: string,
    offerData: RTCSessionDescriptionInit
): Promise<void> {
    await pc.setRemoteDescription(new RTCSessionDescription(offerData));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal(meetingId, {
        type: 'answer',
        from: localUid,
        to: remoteUid,
        data: { sdp: answer.sdp, type: answer.type },
        timestamp: Date.now(),
    });
}

/**
 * Handle an incoming SDP answer
 */
export async function handleAnswer(
    pc: RTCPeerConnection,
    answerData: RTCSessionDescriptionInit
): Promise<void> {
    await pc.setRemoteDescription(new RTCSessionDescription(answerData));
}

/**
 * Handle an incoming ICE candidate
 */
export async function handleICECandidate(
    pc: RTCPeerConnection,
    candidateData: RTCIceCandidateInit
): Promise<void> {
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
        console.error('Failed to add ICE candidate:', err);
    }
}

/**
 * Close a peer connection and clean up
 */
export function closePeerConnection(pc: RTCPeerConnection): void {
    pc.getSenders().forEach((sender) => {
        if (sender.track) {
            sender.track.stop();
        }
    });
    pc.close();
}

/**
 * Stop all tracks in a media stream
 */
export function stopStream(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
}
