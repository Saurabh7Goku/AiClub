'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useClub } from '@/context/ClubContext';
import { subscribeToMeetingRooms, ensureMeetingRooms } from '@/lib/firebase/firestore';
import { MeetingRoom, MeetingRoomId } from '@/types';

export default function MeetingsPage() {
  const { currentClub, loading: clubLoading } = useClub();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const roomOrder: MeetingRoomId[] = useMemo(() => ['room-1', 'room-2', 'room-3', 'room-4'], []);

  useEffect(() => {
    if (clubLoading) return;
    if (!currentClub) {
      setRooms([]);
      setLoading(false);
      return;
    }

    let unsub: (() => void) | null = null;

    const init = async () => {
      setLoading(true);
      try {
        await ensureMeetingRooms(currentClub.id);
        unsub = subscribeToMeetingRooms(currentClub.id, (nextRooms: MeetingRoom[]) => {
          setRooms(nextRooms);
          setLoading(false);
        }, (error: unknown) => {
          console.error('Meeting rooms subscription failed', error);
          setRooms([]);
          setLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize meeting rooms', error);
        setRooms([]);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsub) unsub();
    };
  }, [clubLoading, currentClub]);

  const roomsById = useMemo(() => {
    const map = new Map<string, MeetingRoom>();
    for (const r of rooms) map.set(r.roomId, r);
    return map;
  }, [rooms]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-elevator-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-500">
              Cohorts: {currentClub?.name?.toUpperCase() || 'NODE'}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none">
            <span className="text-accent-500">Cohorts</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm mt-3">
            Fixed operational sectors. Command Level approval required for operative entry.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-20 flex flex-col items-center justify-center gap-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-12 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Grid...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roomOrder.map((roomId) => {
            const room = roomsById.get(roomId);
            const inUse = !!room?.activeMeetingId;
            return (
              <Link
                key={roomId}
                href={`/meetings/${roomId}`}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 group hover:border-accent-500/30 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[60px] rounded-full group-hover:bg-accent-500/10 transition-colors pointer-events-none"></div>
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${inUse ? 'bg-amber-500 text-amber-500 animate-pulse' : 'bg-accent-500 text-accent-500'}`}></span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
                        {inUse ? 'Session Active' : 'Available'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight group-hover:text-accent-400 transition-colors">
                      {roomId.replace('-', ' ').toUpperCase()}
                    </h2>
                    <p className="text-gray-400 text-[13px] font-medium leading-relaxed max-w-sm">
                      {inUse ? 'Bridging authorization required to enter grid.' : 'Initialize a secure transmission in this sector.'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-accent-500/30 group-hover:bg-accent-500/10 transition-all shadow-inner">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
