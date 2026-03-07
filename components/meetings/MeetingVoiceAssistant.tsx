'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, MicrophoneIcon, PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/outline';

interface VoiceMessage {
  role: 'user' | 'ai';
  text: string;
  audioBase64?: string;
  mimeType?: string;
}

interface MeetingVoiceAssistantProps {
  meetingId: string;
  getBoardText?: () => string;
  onTranscriptReady?: (cleanedTranscript: string) => void;
}

type TabId = 'expert' | 'record';

export default function MeetingVoiceAssistant({
  meetingId,
  getBoardText,
  onTranscriptReady,
}: MeetingVoiceAssistantProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('expert');

  // ─── Expert Tab State ───
  const [question, setQuestion] = useState('');
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [askingAI, setAskingAI] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── Speech Recognition State ───
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ─── Record Tab State ───
  const [recording, setRecording] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const recorderRef = useRef<{ mediaRecorder: MediaRecorder | null; chunks: Blob[] }>({
    mediaRecorder: null,
    chunks: [],
  });
  const [rawTranscript, setRawTranscript] = useState('');
  const [cleanedTranscript, setCleanedTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voiceMessages, askingAI]);

  // ─── Speech Recognition (voice input for Expert tab) ───
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setQuestion('(Speech recognition not supported in this browser)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuestion(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-send if we have text
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ─── Expert: Ask AI with TTS ───
  const askExpert = async () => {
    const q = question.trim();
    if (!q || askingAI) return;

    // Stop listening if active
    if (isListening) stopListening();

    setVoiceMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setAskingAI(true);

    try {
      const boardContext = getBoardText?.() || '';
      const res = await fetch('/api/meetings/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, boardContext, meetingId }),
      });
      const data = await res.json();

      if (data.success) {
        const aiMsg: VoiceMessage = {
          role: 'ai',
          text: data.textReply || '(Audio response)',
          audioBase64: data.audioBase64 || undefined,
          mimeType: data.mimeType || undefined,
        };
        setVoiceMessages((prev) => [...prev, aiMsg]);

        // Auto-play audio if available
        if (data.audioBase64 && audioRef.current) {
          try {
            const pcmBytes = atob(data.audioBase64);
            const pcmArray = new Uint8Array(pcmBytes.length);
            for (let i = 0; i < pcmBytes.length; i++) {
              pcmArray[i] = pcmBytes.charCodeAt(i);
            }
            const wavHeader = createWavHeader(pcmArray.length, 24000, 1, 16);
            const wavBlob = new Blob([wavHeader, pcmArray], { type: 'audio/wav' });
            const url = URL.createObjectURL(wavBlob);
            audioRef.current.src = url;
            audioRef.current.play().catch(() => {});
          } catch (e) {
            console.warn('Failed to play audio:', e);
          }
        }
      } else {
        setVoiceMessages((prev) => [
          ...prev,
          { role: 'ai', text: `❌ ${data.error || 'Failed to get response'}` },
        ]);
      }
    } catch {
      setVoiceMessages((prev) => [
        ...prev,
        { role: 'ai', text: '❌ Network error. Please try again.' },
      ]);
    } finally {
      setAskingAI(false);
    }
  };

  // ─── Record Tab: Start/Stop Recording ───
  const startRecording = async () => {
    setRecorderError(null);
    setRawTranscript('');
    setCleanedTranscript('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecorderError('Recording not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current.chunks = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recorderRef.current.chunks.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(250);
      recorderRef.current.mediaRecorder = mr;
      setRecording(true);
    } catch {
      setRecorderError('Microphone permission denied or unavailable.');
    }
  };

  const stopAndTranscribe = async () => {
    const mr = recorderRef.current.mediaRecorder;
    if (!mr) return;

    const blob = await new Promise<Blob>((resolve) => {
      const onStop = () => {
        mr.removeEventListener('stop', onStop);
        const b = new Blob(recorderRef.current.chunks, { type: 'audio/webm' });
        recorderRef.current.mediaRecorder = null;
        recorderRef.current.chunks = [];
        resolve(b);
      };
      mr.addEventListener('stop', onStop);
      mr.stop();
    });

    setRecording(false);

    if (blob.size === 0) {
      setRecorderError('No audio captured.');
      return;
    }

    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('meetingId', meetingId);
      fd.append('audio', new File([blob], `recording_${meetingId}.webm`, { type: 'audio/webm' }));

      const res = await fetch('/api/meetings/transcribe', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success && data.data?.transcript) {
        setRawTranscript(data.data.transcript);
      } else {
        setRecorderError(data.error || 'Transcription failed.');
      }
    } catch {
      setRecorderError('Network error during transcription.');
    } finally {
      setTranscribing(false);
    }
  };

  const cleanTranscript = async () => {
    if (!rawTranscript || cleaning) return;
    setCleaning(true);

    try {
      const res = await fetch('/api/meetings/clean-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTranscript, meetingId }),
      });
      const data = await res.json();

      if (data.success && data.cleanedTranscript) {
        setCleanedTranscript(data.cleanedTranscript);
        onTranscriptReady?.(data.cleanedTranscript);
      } else {
        setRecorderError(data.error || 'Cleanup failed.');
      }
    } catch {
      setRecorderError('Network error during cleanup.');
    } finally {
      setCleaning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askExpert();
    }
  };

  return (
    <>
      {/* Hidden audio player */}
      <audio ref={audioRef} className="hidden" />

      {/* Floating Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-white/10 border border-white/20 text-white font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:bg-white/15 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 transition-all backdrop-blur-sm"
          title="Voice AI — Expert advice with audio responses + Smart Recording"
        >
          <MicrophoneIcon className="w-5 h-5 text-accent-400" />
          Voice AI
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 flex flex-col bg-background border-l border-white/10 shadow-[-10px_0px_40px_rgba(0,0,0,0.8)] transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-card opacity-90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-background border border-white/10 rounded-xl flex items-center justify-center">
              <MicrophoneIcon className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-[rgb(var(--foreground-rgb))] uppercase tracking-tight">Voice AI</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Expert Advice · Smart Recorder</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-card border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setActiveTab('expert')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'expert'
                ? 'text-accent-400 border-accent-500 bg-accent-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            🎤 Ask Expert
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'record'
                ? 'text-accent-400 border-accent-500 bg-accent-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            📝 Smart Record
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--foreground-rgb), 0.1) transparent' }}>
          {activeTab === 'expert' ? (
            /* ─── Expert Tab ─── */
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--foreground-rgb), 0.1) transparent' }}>
                {voiceMessages.length === 0 && (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                      <span className="text-3xl">🎤</span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Speak to the AI Expert
                    </div>
                    <div className="text-xs font-medium text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                      Tap the mic button and speak your question. AI responds with voice audio and text.
                    </div>
                  </div>
                )}

                {voiceMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-accent-500/15 border border-accent-500/30 text-[rgb(var(--foreground-rgb))] rounded-tr-sm shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                          : 'bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] opacity-90 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                      {msg.audioBase64 && (
                        <button
                          onClick={() => {
                            if (!audioRef.current) return;
                            try {
                              const pcmBytes = atob(msg.audioBase64!);
                              const pcmArray = new Uint8Array(pcmBytes.length);
                              for (let j = 0; j < pcmBytes.length; j++) {
                                pcmArray[j] = pcmBytes.charCodeAt(j);
                              }
                              const wavHeader = createWavHeader(pcmArray.length, 24000, 1, 16);
                              const wavBlob = new Blob([wavHeader, pcmArray], { type: 'audio/wav' });
                              const url = URL.createObjectURL(wavBlob);
                              audioRef.current!.src = url;
                              audioRef.current!.play().catch(() => {});
                            } catch (e) {
                              console.warn('Replay failed:', e);
                            }
                          }}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-400 hover:text-accent-300 transition-colors"
                        >
                          🔊 Replay Audio
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {askingAI && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 bg-card border border-white/10 rounded-2xl rounded-tl-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Voice Input Area */}
              <div className="px-4 pb-4 pt-2 border-t border-white/10 flex-shrink-0">
                {/* Mic button for voice input */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex-1 justify-center ${
                      isListening
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                        : 'bg-accent-500/10 border border-accent-500/30 text-accent-400 hover:bg-accent-500/20'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <StopIcon className="w-4 h-4" />
                        Listening... tap to stop
                      </>
                    ) : (
                      <>
                        <MicrophoneIcon className="w-4 h-4" />
                        Tap to Speak
                      </>
                    )}
                  </button>
                </div>

                {/* Text input + send */}
                <div className="flex items-end gap-2">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening...' : 'Or type your question...'}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-white/10 focus:border-accent-500/50 outline-none px-4 py-3 text-sm font-medium text-[rgb(var(--foreground-rgb))] placeholder-gray-500 transition-colors bg-card focus:ring-1 focus:ring-accent-500/30"
                  />
                  <button
                    type="button"
                    onClick={askExpert}
                    disabled={!question.trim() || askingAI}
                    className="w-11 h-11 bg-accent-500 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <PaperAirplaneIcon className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Record Tab ─── */
            <div className="p-4 space-y-4">
              {recorderError && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
                  {recorderError}
                </div>
              )}

              {/* Record Controls */}
              <div className="p-5 space-y-4 bg-card border border-white/10 rounded-2xl">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Step 1: Record Meeting Audio
                </div>

                <div className="flex items-center gap-3">
                  {!recording ? (
                    <button
                      onClick={startRecording}
                      disabled={transcribing || cleaning}
                      className="flex-1 py-3 px-4 rounded-xl bg-accent-500/10 border border-accent-500/30 text-accent-400 text-[11px] font-bold uppercase tracking-widest hover:bg-accent-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <MicrophoneIcon className="w-4 h-4" /> Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopAndTranscribe}
                      className="flex-1 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all animate-pulse flex items-center justify-center gap-2"
                    >
                      <StopIcon className="w-4 h-4" /> Stop & Transcribe
                    </button>
                  )}
                </div>

                {recording && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                      Recording live...
                    </span>
                  </div>
                )}

                {transcribing && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-400">
                      Transcribing audio...
                    </span>
                  </div>
                )}
              </div>

              {/* Raw Transcript */}
              {rawTranscript && (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-2">
                      Raw Transcript
                    </div>
                    <div className="text-xs font-medium text-[rgb(var(--foreground-rgb))] opacity-80 whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--foreground-rgb), 0.1) transparent' }}>
                      {rawTranscript}
                    </div>
                  </div>

                  {/* Clean Button */}
                  <button
                    onClick={cleanTranscript}
                    disabled={cleaning}
                    className="w-full py-3 px-4 rounded-xl bg-card border border-white/10 text-[rgb(var(--foreground-rgb))] text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {cleaning ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-accent-500 rounded-full animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      <>✨ Step 2: AI Clean & Patch</>
                    )}
                  </button>
                </div>
              )}

              {/* Cleaned Transcript */}
              {cleanedTranscript && (
                <div className="p-4 bg-accent-500/5 border border-accent-500/20 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400 mb-2">
                    ✅ Cleaned Transcript
                  </div>
                  <div className="text-xs font-medium text-[rgb(var(--foreground-rgb))] opacity-80 whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--foreground-rgb), 0.1) transparent' }}>
                    {cleanedTranscript}
                  </div>
                  <p className="text-[9px] font-bold text-accent-500/70 uppercase tracking-widest mt-2">
                    Ready for analysis &mdash; use &quot;Generate Briefing&quot; button to produce full summary
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background opacity-40 backdrop-blur-sm sm:bg-background opacity-20"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── WAV Header Utility ───
function createWavHeader(
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): ArrayBuffer {
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize);
  const view = new DataView(buffer);

  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
