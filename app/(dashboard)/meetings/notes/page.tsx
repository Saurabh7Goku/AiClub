'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { MeetingOutput } from '@/types';
import { DocumentTextIcon, CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

function convertTimestamp(ts: any) {
  if (!ts) return new Date();
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
}

export default function MeetingNotesPage() {
  const { user } = useAuth();
  const { currentClub } = useClub();
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState<MeetingOutput[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentClub) {
      setLoading(false);
      return;
    }

    const fetchNotes = async () => {
      try {
        const outRef = collection(db, 'meeting_outputs');
        const q = query(
          outRef,
          where('clubId', '==', currentClub.id),
          where('attendees', 'array-contains', user.uid),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            meetingId: d.meetingId,
            clubId: d.clubId,
            createdAt: convertTimestamp(d.createdAt),
            modelUsed: d.modelUsed,
            transcript: d.transcript,
            summaryNotes: d.summaryNotes,
            futureAgenda: d.futureAgenda || [],
            futureScopes: d.futureScopes || [],
            promises: d.promises || [],
            attendees: d.attendees || [],
          } as MeetingOutput;
        });

        setOutputs(data);
      } catch (err) {
        console.error("Failed to load meeting notes", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user, currentClub]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-elevator-in">
      <div className="flex items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none">
            Meeting <span className="text-accent-500">Notes</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm mt-3">Structured intelligence and logs from your attended sessions.</p>
        </div>
        <Link href="/meetings" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-accent-500 transition-colors border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl">Back to Rooms</Link>
      </div>

      {outputs.length === 0 ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-16 text-center space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-500" />
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">No Records Found</h2>
          <p className="text-gray-400 text-sm">You haven&apos;t attended any recorded sessions in this club yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {outputs.map(out => (
            <div key={out.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {/* Header / Clickable Toggle */}
              <button 
                onClick={() => setExpandedId(expandedId === out.id ? null : out.id)}
                className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-accent-500/10 border border-accent-500/20 p-3 rounded-2xl">
                    <CalendarIcon className="w-6 h-6 text-accent-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Session Intelligence</h3>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1 flex gap-3">
                      <span>{out.createdAt.toLocaleDateString()} at {out.createdAt.toLocaleTimeString()}</span>
                      <span className="text-white/20">|</span>
                      <span>Model: {out.modelUsed}</span>
                    </div>
                  </div>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${expandedId === out.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Expandable Content */}
              {expandedId === out.id && (
                <div className="px-8 pb-8 pt-2 border-t border-white/5 space-y-8 animate-fade-in">
                  
                  {/* Summary Notes */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-accent-500 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
                       Executive Summary
                    </div>
                    <div className="text-sm font-medium text-gray-300 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 whitespace-pre-wrap">
                      {out.summaryNotes}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Promises / Action Items */}
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-accent-500 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
                         Promises & Action Items
                      </div>
                      <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/5 h-full">
                        {out.promises && out.promises.length > 0 ? out.promises.map((p, i) => (
                           <div key={i} className="text-sm font-medium text-gray-300 flex items-start gap-2">
                             <div className="min-w-4 pt-0.5 text-accent-500 font-black">›</div>
                             {p}
                           </div>
                        )) : <div className="text-xs text-gray-500 italic">No promises logged.</div>}
                      </div>
                    </div>

                    {/* Future Agenda */}
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-accent-500 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
                         Future Agenda
                      </div>
                      <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/5 h-full">
                        {out.futureAgenda && out.futureAgenda.length > 0 ? out.futureAgenda.map((a, i) => (
                           <div key={i} className="text-sm font-medium text-gray-300 flex items-start gap-2">
                             <div className="min-w-4 pt-0.5 text-accent-500 font-bold">{i+1}.</div>
                             {a}
                           </div>
                        )) : <div className="text-xs text-gray-500 italic">No agenda items logged.</div>}
                      </div>
                    </div>
                  </div>

                  {/* Future Scopes */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-accent-500 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
                       Future Scopes
                    </div>
                    <div className="flex flex-wrap gap-2 bg-white/5 p-5 rounded-2xl border border-white/5">
                      {out.futureScopes && out.futureScopes.length > 0 ? out.futureScopes.map((scope, i) => (
                        <div key={i} className="px-3 py-1.5 bg-accent-500/10 border border-accent-500/20 rounded-lg text-xs font-bold text-accent-300">
                          {scope}
                        </div>
                      )) : <div className="text-xs text-gray-500 italic">No broad scopes logged.</div>}
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
