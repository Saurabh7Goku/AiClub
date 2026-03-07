'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'react-quill/dist/quill.snow.css';

import { MeetingPresence } from '@/types';
import {
  ensureMeetingBoard,
  subscribeToMeetingBoard,
  updateMeetingBoardDelta
} from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/client';
import * as Y from 'yjs';
import { FirebaseProvider } from '@/lib/firebase/y-firebase';
import { QuillBinding } from 'y-quill';

const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];

const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill');
  const Quill = RQ.Quill || (await import('react-quill')).Quill;
  if (Quill) {
    try {
      const QuillCursors = (await import('quill-cursors')).default;
      Quill.register('modules/cursors', QuillCursors);
    } catch (e) {
      console.warn('quill-cursors registration failed:', e);
    }
  }
  // Wrap RQ to forward our custom ref prop down to the actual ReactQuill class instance
  return function ForwardedQuill(props: any) {
    return <RQ ref={props.forwardedRef} {...props} />;
  };
}, { ssr: false }) as any;

interface MeetingBoardProps {
  meetingId: string;
  user: { uid: string; displayName: string };
  appendText?: string;
  quillRef?: React.MutableRefObject<any>;
}

export default function MeetingBoard({ meetingId, user, appendText, quillRef: externalQuillRef }: MeetingBoardProps) {
  const internalQuillRef = useRef<any>(null);
  const quillRef = externalQuillRef || internalQuillRef;

  // Handle appending text (e.g. from AI assistant)
  useEffect(() => {
    if (appendText && quillRef.current) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const length = editor.getLength();
        // Prefix with newline if not empty
        const textToAppend = length > 1 ? `\n\n${appendText}` : appendText;
        editor.insertText(length - 1, textToAppend, 'api');
        editor.setSelection(length + textToAppend.length);
      }
    }
  }, [appendText, quillRef]);

  const [presenceCount, setPresenceCount] = useState(1);
  const [ready, setReady] = useState(false);

  // Quill modules config
  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
    cursors: true,
    history: { delay: 500, maxStack: 100, userOnly: true },
  }), []);

  // Editor Readiness Polling
  const [editorReady, setEditorReady] = useState(false);
  useEffect(() => {
    if (editorReady) return;
    const interval = setInterval(() => {
      if (quillRef.current && typeof quillRef.current.getEditor === 'function') {
        const editor = quillRef.current.getEditor();
        if (editor) {
          setEditorReady(true);
          clearInterval(interval);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [editorReady, quillRef]);

  // 1. Board Initialization & Sync - Yjs + WebRTC + Firebase Snapshot Persistence
  useEffect(() => {
    if (!editorReady) return;
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('quill');
    
    // Connect to Firebase for serverless signaling + persistence
    const provider = new FirebaseProvider(db, `meeting_boards/${meetingId}`, ydoc);

    // Awareness (Cursors & Presence)
    const myColor = colors[Math.floor(Math.random() * colors.length)];
    provider.awareness.setLocalStateField('user', {
      name: user.displayName,
      color: myColor
    });

    provider.awareness.on('change', () => {
      setPresenceCount(Array.from(provider.awareness.getStates().keys()).length);
    });

    // Bind Quill to Yjs
    const binding = new QuillBinding(ytext, editor, provider.awareness);

    // Initial State Fetch & Persistence sync
    let hasAppliedInitialState = false;
    let unsubBoard: (() => void) | null = null;
    let updateTimer: NodeJS.Timeout | null = null;

    ensureMeetingBoard(meetingId).then(() => {
      unsubBoard = subscribeToMeetingBoard(meetingId, (board: any) => {
        if (!hasAppliedInitialState) {
          hasAppliedInitialState = true;
          // Apply initial if document is empty
          if (ytext.length === 0 && board && board.delta && (board.delta.ops || typeof board.delta === 'string')) {
            try {
              if (board.delta.ops) {
                 // Insert instead of setContents so yjs registers the change and broadcasts it
                 if (editor.getLength() <= 1) {
                    editor.setContents(board.delta as any, 'api');
                 }
              } else {
                 if (editor.getLength() <= 1) {
                    editor.setText(String(board.delta), 'api');
                 }
              }
            } catch (e) {
              console.error('Failed to apply initial remote board state', e);
            }
          }
        }
      });
    });

    // We no longer need updateTimer / saveSnapshot manually sending to legacy Delta
    // because FirebaseProvider natively persists all Yjs operations perpetually.
    
    setReady(true);

    return () => {
      if (unsubBoard) unsubBoard();
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [meetingId, editorReady, user.displayName]);

  // No-op onChange — we handle changes via the yjs sync
  const handleChange = useCallback(() => { }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(var(--foreground-rgb))] opacity-60">
            Real-time Doc
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(var(--foreground-rgb))] opacity-60">
          {presenceCount} active
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative ql-dark-wrapper">
        <ReactQuill
          forwardedRef={quillRef}
          theme="snow"
          defaultValue=""
          onChange={handleChange}
          className="flex-1 ql-dark-editor"
          modules={modules}
        />
        <style jsx global>{`
          .ql-dark-wrapper {
            background: rgb(var(--background-rgb)) !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .ql-dark-wrapper .quill {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
          }
          .ql-dark-editor .ql-container {
            border: none !important;
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .ql-dark-editor .ql-editor {
            flex: 1;
            font-size: 15px;
            line-height: 1.8;
            padding: 2rem 2.5rem;
            color: rgb(var(--foreground-rgb));
            overflow-y: auto;
          }
          .ql-dark-editor .ql-editor.ql-blank::before {
            color: rgba(var(--foreground-rgb), 0.4);
            font-style: normal;
          }
          .ql-dark-editor .ql-toolbar {
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(var(--foreground-rgb), 0.07) !important;
            padding: 0.75rem 1.25rem !important;
            background: rgba(var(--foreground-rgb), 0.02) !important;
          }
          .ql-dark-editor .ql-toolbar .ql-stroke {
            stroke: rgba(var(--foreground-rgb), 0.5) !important;
          }
          .ql-dark-editor .ql-toolbar .ql-fill {
            fill: rgba(var(--foreground-rgb), 0.5) !important;
          }
          .ql-dark-editor .ql-toolbar .ql-picker-label {
            color: rgba(var(--foreground-rgb), 0.5) !important;
          }
          .ql-dark-editor .ql-toolbar button:hover .ql-stroke,
          .ql-dark-editor .ql-toolbar .ql-active .ql-stroke {
            stroke: #f59e0b !important;
          }
          .ql-dark-editor .ql-toolbar button:hover .ql-fill,
          .ql-dark-editor .ql-toolbar .ql-active .ql-fill {
            fill: #f59e0b !important;
          }
          .ql-dark-editor .ql-editor::-webkit-scrollbar {
            width: 6px;
          }
          .ql-dark-editor .ql-editor::-webkit-scrollbar-track {
            background: transparent;
          }
          .ql-dark-editor .ql-editor::-webkit-scrollbar-thumb {
            background: rgba(var(--foreground-rgb), 0.1);
            border-radius: 3px;
          }
        `}</style>
      </div>
    </div>
  );
}
