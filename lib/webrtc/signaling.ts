'use client';

import { rtdb } from '@/lib/firebase/client';
import {
    ref,
    set,
    push,
    remove,
    update,
    onValue,
    onChildAdded,
    onChildRemoved,
    off,
    serverTimestamp,
    DataSnapshot,
} from 'firebase/database';
import { VideoParticipant, RTCSignal } from '@/types';

// ==================== VIDEO ROOM MANAGEMENT ====================

/**
 * Create or join a video signaling room in Firebase RTDB
 */
export function joinVideoRoom(
    meetingId: string,
    participant: VideoParticipant
): void {
    const participantRef = ref(rtdb, `videoRooms/${meetingId}/participants/${participant.uid}`);
    set(participantRef, {
        ...participant,
        joinedAt: Date.now(),
    });
}

/**
 * Leave a video room — removes participant and cleans up signals
 */
export function leaveVideoRoom(meetingId: string, uid: string): void {
    const participantRef = ref(rtdb, `videoRooms/${meetingId}/participants/${uid}`);
    remove(participantRef);

    // Clean up signals addressed to this user
    const signalsRef = ref(rtdb, `videoRooms/${meetingId}/signals/${uid}`);
    remove(signalsRef);
}

/**
 * Update participant media state (mic/camera/screenshare toggles)
 */
export function updateParticipantMedia(
    meetingId: string,
    uid: string,
    updates: Partial<Pick<VideoParticipant, 'hasVideo' | 'hasAudio' | 'isScreenSharing'>>
): void {
    const participantRef = ref(rtdb, `videoRooms/${meetingId}/participants/${uid}`);
    update(participantRef, updates);
}

// ==================== SIGNALING ====================

/**
 * Send a WebRTC signal (offer/answer/ICE candidate) to a specific peer
 */
export function sendSignal(meetingId: string, signal: RTCSignal): void {
    const signalRef = ref(rtdb, `videoRooms/${meetingId}/signals/${signal.to}`);
    const newSignalRef = push(signalRef);
    set(newSignalRef, {
        ...signal,
        timestamp: Date.now(),
    });
}

/**
 * Listen for incoming signals addressed to a specific user
 */
export function onSignal(
    meetingId: string,
    uid: string,
    callback: (signal: RTCSignal, signalKey: string) => void
): () => void {
    const signalsRef = ref(rtdb, `videoRooms/${meetingId}/signals/${uid}`);

    const unsubscribe = onChildAdded(signalsRef, (snapshot: DataSnapshot) => {
        const signal = snapshot.val() as RTCSignal;
        if (signal && snapshot.key) {
            callback(signal, snapshot.key);
            // Remove consumed signal to keep RTDB clean
            remove(snapshot.ref);
        }
    });

    return () => off(signalsRef);
}

// ==================== PARTICIPANT SUBSCRIPTIONS ====================

/**
 * Subscribe to participants joining/leaving the video room
 */
export function onParticipantsChanged(
    meetingId: string,
    callbacks: {
        onJoin: (uid: string, participant: VideoParticipant) => void;
        onLeave: (uid: string) => void;
        onUpdate: (participants: Record<string, VideoParticipant>) => void;
    }
): () => void {
    const participantsRef = ref(rtdb, `videoRooms/${meetingId}/participants`);

    const unsubJoin = onChildAdded(participantsRef, (snapshot: DataSnapshot) => {
        if (snapshot.key && snapshot.val()) {
            callbacks.onJoin(snapshot.key, snapshot.val() as VideoParticipant);
        }
    });

    const unsubRemove = onChildRemoved(participantsRef, (snapshot: DataSnapshot) => {
        if (snapshot.key) {
            callbacks.onLeave(snapshot.key);
        }
    });

    // Full snapshot listener for updates (media toggles)
    const unsubValue = onValue(participantsRef, (snapshot: DataSnapshot) => {
        const participants = (snapshot.val() || {}) as Record<string, VideoParticipant>;
        callbacks.onUpdate(participants);
    });

    return () => {
        off(participantsRef);
    };
}

/**
 * Destroy the entire video room (called when meeting ends)
 */
export function destroyVideoRoom(meetingId: string): void {
    const roomRef = ref(rtdb, `videoRooms/${meetingId}`);
    remove(roomRef);
}
