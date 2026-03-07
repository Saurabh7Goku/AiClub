'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import {
  createMeetingSessionForRoom,
  createMeetingOutput,
  decideJoinRequest,
  endMeetingSession,
  ensureMeetingRooms,
  requestToJoinMeeting,
  setMeetingRoomActiveMeetingId,
  subscribeToActiveMeetingForRoom,
  subscribeToJoinRequests,
  subscribeToMeetingOutput,
  subscribeToMyJoinRequest,
  getMeetingBoardText,
  getMeetingCanvasData,
} from '@/lib/firebase/firestore';
import { MeetingJoinRequest, MeetingOutput, MeetingRoomId, MeetingSession } from '@/types';
import MeetingBoard from '@/components/meetings/MeetingBoard';
import MeetingCanvas from '@/components/meetings/MeetingCanvas';
import MeetingVoiceAssistant from '@/components/meetings/MeetingVoiceAssistant';
import VideoConference from '@/components/meetings/VideoConference';
import CalendarSync from '@/components/meetings/CalendarSync';
import { useRouter } from 'next/navigation';

const ROOM_IDS: MeetingRoomId[] = ['room-1', 'room-2', 'room-3', 'room-4'];

export default function MeetingRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as string;

  const { user, isAdmin, isLeader } = useAuth();
  const { currentClub, loading: clubLoading } = useClub();

  const parsedRoomId = useMemo(() => {
    if (ROOM_IDS.includes(roomId as MeetingRoomId)) return roomId as MeetingRoomId;
    return null;
  }, [roomId]);

  const [meeting, setMeeting] = useState<MeetingSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [joinReq, setJoinReq] = useState<MeetingJoinRequest | null>(null);
  const [allReqs, setAllReqs] = useState<MeetingJoinRequest[]>([]);

  const [recording, setRecording] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [activeBoard, setActiveBoard] = useState<'doc' | 'canvas' | 'video'>('doc');
  const recorderRef = useState<{ mediaRecorder: MediaRecorder | null; chunks: Blob[] }>(() => ({ mediaRecorder: null, chunks: [] }))[0];

  const [processingAudio, setProcessingAudio] = useState(false);
  const boardQuillRef = useRef<any>(null);
  const router = useRouter();

  const getBoardText = useCallback(() => {
    try {
      const quill = boardQuillRef.current?.getEditor?.();
      return quill ? quill.getText() : '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    if (clubLoading) return;
    if (!currentClub || !parsedRoomId) {
      setMeeting(null);
      setLoading(false);
      return;
    }

    let unsubMeeting: (() => void) | null = null;

    const init = async () => {
      setLoading(true);
      try {
        await ensureMeetingRooms(currentClub.id);
        unsubMeeting = subscribeToActiveMeetingForRoom(
          currentClub.id,
          parsedRoomId,
          (m) => {
            setMeeting(m);
            setLoading(false);
          },
          (error) => {
            console.error('Active meeting subscription failed', error);
            setMeeting(null);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Failed to initialize meeting room', error);
        setMeeting(null);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubMeeting) unsubMeeting();
    };
  }, [clubLoading, currentClub, parsedRoomId]);

  const startRecording = async () => {
    setRecorderError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecorderError('Recording not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = { mimeType: 'audio/webm' };
      const mr = new MediaRecorder(stream, options);

      recorderRef.chunks = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recorderRef.chunks.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(250);
      recorderRef.mediaRecorder = mr;
      setRecording(true);
    } catch (e) {
      console.error('Failed to start recording', e);
      setRecorderError('Microphone permission denied or unavailable.');
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    const mr = recorderRef.mediaRecorder;
    if (!mr) return null;

    return await new Promise((resolve) => {
      const onStop = () => {
        mr.removeEventListener('stop', onStop);
        const blob = new Blob(recorderRef.chunks, { type: 'audio/webm' });
        recorderRef.mediaRecorder = null;
        recorderRef.chunks = [];
        setRecording(false);
        resolve(blob);
      };

      mr.addEventListener('stop', onStop);
      mr.stop();
    });
  };

  const handleEndMeetingAndGenerate = async () => {
    if (!meeting || !currentClub || !parsedRoomId) return;
    if (!isAdmin && !isLeader) return;

    setProcessingAudio(true);
    try {
      let blob: Blob | null = null;
      if (recording) {
        blob = await stopRecording();
      }

      let boardText = getBoardText();
      if (!boardText || boardText.trim().length === 0) {
        const dbText = await getMeetingBoardText(meeting.id);
        if (dbText && dbText.trim().length > 0) {
          boardText = dbText;
        }
      }

      if ((!blob || blob.size === 0) && (!boardText || boardText.trim().length === 0)) {
        alert('Meeting ended. No recording or specific doc board notes found to process.');
        await endMeetingSession(meeting.id);
        await setMeetingRoomActiveMeetingId(currentClub.id, parsedRoomId, null);
        setProcessingAudio(false);
        return;
      }

      // try to grab the canvas state if available
      let canvasSnapshot: string | null = null;
      try {
        const canvas = await getMeetingCanvasData(meeting.id);
        if (canvas && canvas.paths && canvas.paths.length > 0) {
          canvasSnapshot = JSON.stringify(canvas.paths);
        }
      } catch (e) {
        console.error('Failed to read meeting canvas at end:', e);
      }

      await endMeetingSession(meeting.id);
      await setMeetingRoomActiveMeetingId(currentClub.id, parsedRoomId, null);

      const fd = new FormData();
      fd.append('meetingId', meeting.id);

      if (blob && blob.size > 0) {
        fd.append('audio', new File([blob], `meeting_${meeting.id}.webm`, { type: 'audio/webm' }));
      }

      if (boardText && boardText.trim().length > 0) {
        fd.append('boardText', boardText);
      }
      if (canvasSnapshot) {
        // send as a plain string field; the API will incorporate it into the prompt
        fd.append('canvasData', canvasSnapshot);
      }

      const res = await fetch('/api/meetings/process-audio', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(json?.error || 'Failed to process meeting intelligence');
      }

      await createMeetingOutput(meeting.id, currentClub.id, {
        modelUsed: json.data.modelUsed,
        transcript: json.data.transcript || 'No audio provided.',
        summaryNotes: json.data.summaryNotes || '',
        futureAgenda: json.data.futureAgenda || [],
        futureScopes: json.data.futureScopes || [],
        promises: json.data.promises || [],
        attendees: meeting.attendees || [],
        canvasSnapshot: canvasSnapshot || undefined,
      });

      // Redirect to the meeting notes repository to see the new structured output.
      router.push('/meetings/notes');

    } catch (e) {
      console.error('Failed to end meeting / generate output', e);
      alert('Failed to end meeting and generate output. Check console logs.');
    } finally {
      setProcessingAudio(false);
    }
  };

  useEffect(() => {
    if (!meeting || !user || !currentClub) {
      setJoinReq(null);
      return;
    }

    if (isAdmin || isLeader) {
      setJoinReq({
        id: user.uid,
        meetingId: meeting.id,
        clubId: currentClub.id,
        uid: user.uid,
        displayName: user.displayName,
        status: 'approved',
        createdAt: new Date(),
      });
      return;
    }

    const unsub = subscribeToMyJoinRequest(
      meeting.id,
      user.uid,
      (req) => setJoinReq(req),
      (error) => {
        console.error('Join request subscription failed', error);
        setJoinReq(null);
      }
    );

    return () => unsub();
  }, [meeting, user, currentClub, isAdmin, isLeader]);

  useEffect(() => {
    if (!meeting) {
      setAllReqs([]);
      return;
    }
    if (!isAdmin && !isLeader) {
      setAllReqs([]);
      return;
    }

    const unsub = subscribeToJoinRequests(
      meeting.id,
      (reqs) => {
        const sorted = reqs.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllReqs(sorted);
      },
      (error) => {
        console.error('Join requests subscription failed', error);
        setAllReqs([]);
      }
    );

    return () => unsub();
  }, [meeting, isAdmin, isLeader]);

  // Deleted subscription logic since we no longer display notes here inline.

  const handleStartMeeting = async () => {
    if (!currentClub || !parsedRoomId || !user) return;
    if (!isAdmin && !isLeader) return;

    try {
      await createMeetingSessionForRoom(currentClub.id, parsedRoomId, {
        uid: user.uid,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error('Failed to start meeting', error);
      alert('Failed to start meeting');
    }
  };

  const handleJoinRequest = async () => {
    if (!currentClub || !meeting || !user) return;

    try {
      await requestToJoinMeeting(meeting.id, currentClub.id, {
        uid: user.uid,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error('Failed to request join', error);
      alert('Failed to request join');
    }
  };

  const handleDecision = async (targetUid: string, decision: 'approved' | 'rejected') => {
    if (!meeting || !user) return;
    if (!isAdmin && !isLeader) return;

    try {
      await decideJoinRequest(meeting.id, targetUid, decision, user.uid);
    } catch (error) {
      console.error('Failed to decide join request', error);
      alert('Failed to update request');
    }
  };

  if (!parsedRoomId) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-elevator-in">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 text-center space-y-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-tight">Invalid Sector</h1>
          <p className="text-gray-400 text-sm font-medium">This operational room does not exist.</p>
          <Link href="/meetings" className="text-accent-500 font-bold text-xs uppercase tracking-widest hover:text-accent-400 transition-colors">Return to Grid</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-10 pb-20 animate-elevator-in">
      <div className="flex items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-500 mb-2">Sector: {parsedRoomId.toUpperCase()}</p>
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none">
            Meeting <span className="text-accent-500">Session</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm mt-3">Collaborate in real time. Operatives require approval to enter.</p>
        </div>
        <Link href="/meetings" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-accent-500 transition-colors border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl">All Rooms</Link>
      </div>

      {loading ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-20 flex flex-col items-center justify-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-12 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Session...</p>
        </div>
      ) : !meeting ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Available</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">No Active Meeting</h2>
            <p className="text-gray-400 text-sm font-medium">A leader/admin can initialize a new session in this sector.</p>
          </div>
          {(isAdmin || isLeader) ? (
            <button onClick={handleStartMeeting} className="btn-primary px-8 py-4 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all relative z-10">
              Initialize Session
            </button>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-xl border border-white/5 relative z-10">Waiting for Command Level</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {joinReq?.status === 'approved' ? (
              <>
                <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                  <button
                    onClick={() => setActiveBoard('doc')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeBoard === 'doc' ? 'bg-accent-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-gray-400 hover:text-white'}`}
                  >
                    Doc Board
                  </button>
                  <button
                    onClick={() => setActiveBoard('canvas')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeBoard === 'canvas' ? 'bg-accent-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-gray-400 hover:text-white'}`}
                  >
                    Canvas Board
                  </button>
                  <button
                    onClick={() => setActiveBoard('video')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeBoard === 'video' ? 'bg-accent-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-gray-400 hover:text-white'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Video
                  </button>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mt-2">
                  Doc Board notes are shared in real time with all approved attendees in this meeting.
                </p>

                {user && activeBoard === 'video' ? (
                  <div className="w-full mt-4">
                    <VideoConference
                      meetingId={meeting.id}
                      user={{ uid: user.uid, displayName: user.displayName }}
                      isAdmin={isAdmin || isLeader}
                    />
                  </div>
                ) : user && (
                  <div className="h-[600px] w-full mt-4 relative">
                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeBoard === 'doc' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
                      <MeetingBoard
                        meetingId={meeting.id}
                        user={{ uid: user.uid, displayName: user.displayName }}
                        quillRef={boardQuillRef}
                      />
                    </div>
                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeBoard === 'canvas' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
                      <MeetingCanvas meetingId={meeting.id} />
                    </div>
                  </div>
                )}

                <MeetingVoiceAssistant
                  meetingId={meeting.id}
                  getBoardText={getBoardText}
                  onTranscriptReady={() => { }}
                />
              </>
            ) : (
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 text-center space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                  <span className={`w-3 h-3 rounded-full ${joinReq?.status === 'pending' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse' : joinReq?.status === 'rejected' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-accent-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}></span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight mb-2">Secure Link Requested</h2>
                  <p className="text-gray-400 text-sm font-medium max-w-sm mx-auto">
                    {joinReq?.status === 'pending'
                      ? 'Your request is transmitting. Awaiting Command Level approval.'
                      : joinReq?.status === 'rejected'
                        ? 'Request denied. Contact your administrator.'
                        : 'Request authorization to bridge into this active session.'}
                  </p>
                </div>
                {!joinReq && (
                  <button onClick={handleJoinRequest} className="btn-primary px-8 py-3 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all">
                    Request Authorization
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <span className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">Live Session Details</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Session ID</div>
                <div className="text-xs font-mono text-white bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 truncate">{meeting.id}</div>
              </div>
            </div>

            {(isAdmin || isLeader) && (
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">Operations Command</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white">Admin Privileges</div>
                </div>

                {recorderError && (
                  <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{recorderError}</div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-col gap-3">
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="w-full btn-primary py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                        Initiate Surveillance
                      </button>
                    ) : (
                      <button
                        onClick={() => stopRecording()}
                        className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Terminate Surveillance
                      </button>
                    )}

                    <button
                      onClick={handleEndMeetingAndGenerate}
                      disabled={processingAudio}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 transition-colors"
                    >
                      {processingAudio ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                          Compiling Report...
                        </span>
                      ) : 'Conclude Session & Generate Briefing'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest pt-2 border-t border-white/5">
                    <span className="text-gray-500">Status</span>
                    {recording ? <span className="text-red-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Recording Audio</span> : <span className="text-gray-400">Idle</span>}
                  </div>
                </div>
              </div>
            )}

            {(isAdmin || isLeader) && (
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">Access Requests</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded text-white">{allReqs.length}</div>
                </div>

                {allReqs.length === 0 ? (
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center py-4 bg-white/5 rounded-xl border border-white/5 border-dashed">No active perimeter breaches</div>
                ) : (
                  <div className="space-y-3">
                    {allReqs.map((r) => (
                      <div key={r.uid} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-white truncate mb-0.5">{r.displayName}</div>
                            <div className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block ${r.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : r.status === 'approved' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{r.status}</div>
                          </div>
                          {r.status === 'pending' && (
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleDecision(r.uid, 'approved')}
                                className="text-[9px] font-bold uppercase tracking-widest bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/30 text-accent-400 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Authorize
                              </button>
                              <button
                                onClick={() => handleDecision(r.uid, 'rejected')}
                                className="text-[9px] font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <CalendarSync
              meetingId={meeting.id}
              roomName={parsedRoomId.toUpperCase()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
