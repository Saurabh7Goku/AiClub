'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import {
    subscribeToClubEvents,
    createClubEvent,
    rsvpClubEvent,
    notifyClubMembers,
    ClubEvent
} from '@/lib/firebase/firestore';
import {
    PlusIcon,
    MapPinIcon,
    ClockIcon,
    UserGroupIcon,
    CalendarIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import Toast from '@/components/ui/Toast';
import Countdown from '@/components/ui/Countdown';

const EVENT_TYPES = ['Workshop', 'Meeting', 'Hackathon', 'Seminar', 'Other'] as const;
const TYPE_COLORS: Record<string, string> = {
    Workshop: 'bg-primary-500',
    Meeting: 'bg-blue-500',
    Hackathon: 'bg-rose-500',
    Seminar: 'bg-purple-500',
    Other: 'bg-gray-700',
};

export default function CalendarPage() {
    const { user } = useAuth();
    const { currentClub } = useClub();
    const [events, setEvents] = useState<ClubEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<typeof EVENT_TYPES[number]>('Workshop');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [location, setLocation] = useState('');
    const [maxAttendees, setMaxAttendees] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    useEffect(() => {
        if (!currentClub) return;
        const unsub = subscribeToClubEvents(currentClub.id, (data) => {
            setEvents(data);
            setLoading(false);

            // Check for upcoming events
            const now = new Date();
            const upcomingEvents = data.filter(event => {
                const eventDate = new Date(event.startDate);
                return eventDate > now && eventDate < new Date(now.getTime() + 24 * 60 * 60 * 1000);
            });
            if (upcomingEvents.length > 0) {
                setToast({
                    show: true,
                    message: `You have ${upcomingEvents.length} upcoming event${upcomingEvents.length > 1 ? 's' : ''} in the next 24 hours.`
                });
            }
        });
        return () => unsub();
    }, [currentClub]);

    const filteredEvents = events.filter(e => filter === 'all' || e.type === filter);

    const handleCreate = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!user || !currentClub || !title || !startDate) return;
        setCreating(true);
        try {
            const dateObj = new Date(`${startDate}T${startTime || '00:00'}`);
            await createClubEvent({
                clubId: currentClub.id,
                title,
                description,
                type,
                startDate: dateObj,
                location,
                organizerId: user.uid,
                attendees: [user.uid],
                maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
            });
            // Notify all club members
            notifyClubMembers(
                currentClub.id, user.uid, user.displayName || 'A member',
                'new_event', `New Event: ${title}`,
                `${user.displayName || 'Someone'} created a new ${type} event: "${title}"`,
                { actionUrl: '/calendar' }
            );
            setShowModal(false);
            setTitle(''); setDescription(''); setStartDate(''); setStartTime(''); setLocation(''); setMaxAttendees('');
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const handleRSVP = async (eventId: string) => {
        if (!user) return;
        await rsvpClubEvent(eventId, user.uid);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-elevator-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1 relative">
                    <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
                        Events & <span className="text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Timeline</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-400 mt-2 relative z-10">{events.length} events · {currentClub?.name}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 btn-primary px-6 py-3.5 font-bold text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition-all"
                >
                    <PlusIcon className="w-4 h-4" /> New Event
                </button>
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-3">
                {['all', ...EVENT_TYPES].map(t => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border transition-all ${filter === t ? 'bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105' : 'bg-black/40 backdrop-blur-md text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                    >
                        {t === 'all' ? 'All Events' : t}
                    </button>
                ))}
            </div>

            {/* Events list */}
            {loading ? (
                <div className="space-y-5">
                    {[1, 2, 3].map(i => <div key={i} className="h-36 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] animate-pulse" />)}
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="bg-black/40 backdrop-blur-xl border border-dashed border-white/20 rounded-[3rem] p-20 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mx-auto mb-6">
                        <CalendarIcon className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="font-extrabold text-white text-xl uppercase tracking-wider mb-2">
                        {filter !== 'all' ? `No ${filter} events yet` : 'No events scheduled'}
                    </h3>
                    <p className="text-gray-400 font-medium text-sm mb-8">Create an event to gather the club together.</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        Schedule First Event
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredEvents.map(event => {
                        const isAttending = user ? event.attendees.includes(user.uid) : false;
                        const d = new Date(event.startDate);
                        // Map old type colors to glassmorphic friendly equivalents if needed, or stick to the ones defined. 
                        // The existing TYPE_COLORS uses solid backgrounds like bg-primary-500. We can add a gradient or overlay inside.

                        return (
                            <div key={event.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row group hover:border-accent-500/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all">
                                <div className={`w-full md:w-40 relative flex flex-col items-center justify-center p-6 text-white text-center shrink-0 border-r border-white/5`}>
                                    <div className={`absolute inset-0 ${TYPE_COLORS[event.type]} opacity-20 group-hover:opacity-30 transition-opacity`} />
                                    <div className="relative z-10 w-full">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-300 block mb-2">{event.type}</span>
                                        <span className="text-5xl font-extrabold leading-none block mb-1 drop-shadow-md">{d.getDate()}</span>
                                        <span className="text-sm font-bold uppercase tracking-widest text-accent-400">{d.toLocaleString('en', { month: 'short' })}</span>
                                        <span className="text-[10px] font-bold mt-2 opacity-60 block">{d.getFullYear()}</span>
                                    </div>
                                </div>

                                <div className="flex-1 p-8 flex flex-col md:flex-row gap-6 justify-between relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

                                    <div className="flex-1 min-w-0 relative z-10">
                                        <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight mb-2 group-hover:text-accent-400 transition-colors">{event.title}</h3>
                                        {event.description && <p className="text-sm text-gray-400 font-medium leading-relaxed line-clamp-2">{event.description}</p>}
                                        {d > new Date() && <Countdown targetDate={d} />}
                                        <div className="flex flex-wrap items-center gap-5 mt-6 border-t border-white/10 pt-4">
                                            <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                                                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <ClockIcon className="w-3.5 h-3.5 text-accent-500" />
                                                </div>
                                                {d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                        <MapPinIcon className="w-3.5 h-3.5 text-accent-500" />
                                                    </div>
                                                    {event.location}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                                                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <UserGroupIcon className="w-3.5 h-3.5 text-accent-500" />
                                                </div>
                                                {event.attendees.length}{event.maxAttendees ? `/${event.maxAttendees}` : ''} Attending
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex md:items-center relative z-10">
                                        <button
                                            onClick={() => handleRSVP(event.id)}
                                            disabled={isAttending}
                                            className={`px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${isAttending ? 'bg-white/5 border border-white/10 text-gray-500 cursor-default shadow-inner' : 'bg-accent-500 text-black border border-accent-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95'}`}
                                        >
                                            {isAttending ? '✓ Attending' : 'RSVP Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-6">
                    <div className="bg-black/90 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden animate-elevator-in">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center justify-between p-8 border-b border-white/10 relative z-10">
                            <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">New Event</h2>
                            <button onClick={() => setShowModal(false)} className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 custom-scrollbar">
                            {[
                                { label: 'Title *', value: title, setter: setTitle, placeholder: 'Event name…', required: true },
                                { label: 'Location', value: location, setter: setLocation, placeholder: 'Virtual / Campus / Room…', required: false },
                            ].map(f => (
                                <div key={f.label}>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">{f.label}</label>
                                    <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} required={f.required}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner placeholder:text-gray-600 transition-all" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this event about?…"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner placeholder:text-gray-600 transition-all resize-none" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Type</label>
                                    <select value={type} onChange={e => setType(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 shadow-inner transition-all appearance-none [&>option]:bg-gray-900">
                                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Max Seats</label>
                                    <input value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} type="number" placeholder="Unlimited"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner placeholder:text-gray-600 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Date *</label>
                                    <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner transition-all [color-scheme:dark]" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Time</label>
                                    <input value={startTime} onChange={e => setStartTime(e.target.value)} type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 shadow-inner transition-all [color-scheme:dark]" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={creating || !title || !startDate}
                                    className="w-full btn-primary rounded-2xl py-4 font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:grayscale active:scale-[0.98] transition-all">
                                    {creating ? 'Creating…' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        {toast.show && <Toast message={toast.message} onClose={() => setToast({ show: false, message: '' })} />}
        </div>
    );
}
