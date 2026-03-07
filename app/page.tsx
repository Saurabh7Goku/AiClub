'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// ─── Logo ─────────────────────────────────────────────────────────────────────
function AILogo({ size = 40 }: { size?: number }) {
    return (
        <div
            style={{ width: size, height: size }}
            className="bg-accent-500/10 border border-accent-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] flex-shrink-0"
        >
            <span className="text-accent-500 font-black text-sm tracking-tighter">AI</span>
        </div>
    );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const links = [
        ['Features', '#features'],
        ['How It Works', '#how-it-works'],
        ['Projects', '#projects'],
        ['AI News', '#ai-news'],
        ['Impact', '#impact'],
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled 
            ? 'py-3 bg-white/70 dark:bg-black/60 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
            : 'py-5 bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex items-center justify-between h-12">
                <Link href="/" className="flex items-center gap-3 group outline-none">
                    <AILogo size={40} />
                    <div className="hidden sm:flex flex-col">
                        <span className="font-extrabold text-sm text-white leading-none tracking-tight uppercase">MPOnline AI</span>
                        <span className="text-[10px] font-bold text-accent-500 uppercase tracking-[0.15em] leading-none mt-1">Foundation Club</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden lg:flex items-center space-x-1">
                    {links.map(([lbl, href]) => (
                        <a key={lbl} href={href}
                            className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-all hover:bg-white/5">
                            {lbl}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M6.343 6.343l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>

                    {!authLoading && user ? (
                        <Link href="/dashboard"
                            className="btn-primary py-2.5 px-6 text-[11px] font-bold uppercase tracking-widest">
                            Dashboard →
                        </Link>
                    ) : (
                        <>
                            <Link href="/login"
                                className="hidden sm:block text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-xl transition-colors">
                                Login
                            </Link>
                            <Link href="/signup"
                                className="btn-primary py-2.5 px-6 text-[11px] font-bold uppercase tracking-widest">
                                Join Club →
                            </Link>
                        </>
                    )}
                    <button className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:bg-white/10 transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                        </svg>
                    </button>
                </div>
            </div>
            {mobileOpen && (
                <div className="lg:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 px-6 py-6 space-y-2 absolute top-full left-0 right-0 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                    {links.map(([lbl, href]) => (
                        <a key={lbl} href={href} onClick={() => setMobileOpen(false)}
                            className="block text-[12px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl transition-all">
                            {lbl}
                        </a>
                    ))}
                </div>
            )}
        </nav>
    );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function HeroSection() {
    return (
        <section className="relative pt-32 pb-24 overflow-hidden min-h-[90vh] flex items-center">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left */}
                    <div className="space-y-8 animate-elevator-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(16,185,129,0.1)] text-accent-400 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                            MPOnline AI Innovation Club
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] uppercase tracking-tight">
                            Smart AI<br />
                            for Smart<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-amber-600">Governance.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
                            The internal hub for submitting AI ideas, peer voting, AI-assisted drafting,
                            and collaborative meetings &mdash; built for MPOnline employees.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link href="/signup"
                                className="btn-primary py-4 px-8 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all">
                                Apply for Membership
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                            <Link href="/login"
                                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md">
                                Sign In to Dashboard
                            </Link>
                        </div>
                    </div>

                    {/* Right — Feature chips */}
                    <div className="flex flex-wrap gap-4 content-start animate-elevator-in-delay-1 relative">
                         {/* Subtle decoration */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[3rem] border border-white/5 backdrop-blur-sm -z-10 transform rotate-3 scale-105" />
                        
                        {[
                            { icon: '💡', lbl: 'Idea Submission' },
                            { icon: '🗳', lbl: 'Peer Voting' },
                            { icon: '🤖', lbl: 'AI Drafts' },
                            { icon: '⚡', lbl: 'Live Tech Feed' },
                            { icon: '🏠', lbl: 'Cohorts' },
                            { icon: '📋', lbl: 'AI Summaries' },
                        ].map((chip, i) => (
                            <div key={i} className="inline-flex items-center gap-3 px-5 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-[0.15em] text-gray-300 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-accent-500/30 hover:text-white transition-all hover:-translate-y-1">
                                <span className="text-xl bg-white/5 p-2 rounded-xl">{chip.icon}</span>
                                {chip.lbl}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Features ────────────────────────────────────────────────────────────────
function FeaturesSection() {
    const features = [
        {
            icon: '💡', bg: 'bg-primary-500/10 text-primary-500', border: 'border-primary-500/20',
            title: 'Idea Submission',
            desc: 'Submit AI project ideas with problem statement, proposed AI usage, and category tags visible to all club members.',
        },
        {
            icon: '🗳', bg: 'bg-amber-500/10 text-amber-600', border: 'border-amber-500/20',
            title: 'Peer Voting',
            desc: 'Members vote ideas up or down. Proposals reaching 7 verified votes automatically enter the formal review phase.',
        },
        {
            icon: '🤖', bg: 'bg-amber-500/10 text-amber-500', border: 'border-amber-500/20',
            title: 'AI Draft Generator',
            desc: 'Approved ideas get an AI-generated architecture outline, feasibility analysis, risks, and next steps.',
        },
        {
            icon: '⚡', bg: 'bg-primary-500/10 text-primary-500', border: 'border-primary-500/20',
            title: 'Live Tech Feed',
            desc: 'Real-time AI news feed from top global sources — stay updated with trends relevant to government tech.',
        },
        {
            icon: '🏠', bg: 'bg-gray-500/10 text-gray-300', border: 'border-gray-500/20',
            title: 'Cohorts',
            desc: '4 virtual cohorts with real-time presence tracking, join-request flow, and shared collaborative whiteboard.',
        },
        {
            icon: '📋', bg: 'bg-amber-500/10 text-amber-600', border: 'border-amber-500/20',
            title: 'AI Meeting Summaries',
            desc: 'After every meeting, AI auto-generates transcript, decisions, action items, and an implementation plan.',
        },
    ];

    return (
        <section className="py-32 relative" id="features">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl z-0" />
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6 backdrop-blur-md">
                        Platform Features
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">Everything You Need<br /><span className="text-gray-500">to Innovate.</span></h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 group hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className={`w-14 h-14 rounded-2xl ${f.bg} border ${f.border} flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10`}>
                                {f.icon}
                            </div>
                            <h3 className="font-extrabold text-white text-lg uppercase tracking-tight mb-3 relative z-10">{f.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed font-medium relative z-10">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
    const steps = [
        { num: '01', bg: 'bg-primary-500/20 text-primary-400', border: 'border-primary-500/30', title: 'Submit Your Idea', desc: 'Any club member submits an AI project idea with problem statement, proposed approach, and category (LLM, Vision, Infra, etc.)' },
        { num: '02', bg: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30', title: 'Peer Voting', desc: 'Members vote up or down. Ideas with 7+ positive votes automatically move to formal review phase.' },
        { num: '03', bg: 'bg-amber-500/20 text-amber-500', border: 'border-amber-500/30', title: 'AI-Assisted Review', desc: 'AI generates a full research draft — architecture outline, feasibility notes, risk analysis, and next steps.' },
        { num: '04', bg: 'bg-gray-500/20 text-gray-300', border: 'border-gray-500/30', title: 'Collaborate & Deploy', desc: 'Team meets in a virtual room. AI records the session and generates meeting summary, decisions, and action items.' },
    ];

    return (
        <section className="py-32 relative overflow-hidden" id="how-it-works">
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
            
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
                <div className="mb-20">
                    <div className="inline-flex items-center px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6 backdrop-blur-md">
                        Workflow
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">From Idea to<br /><span className="text-primary-500">Implementation.</span></h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {steps.map((step, i) => (
                        <div key={i} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:-translate-y-1">
                            <div className="absolute top-[-20%] right-[-10%] text-[10rem] font-black text-white/[0.02] leading-none select-none group-hover:text-white/[0.04] transition-colors duration-500">{step.num}</div>
                            
                            <div className={`w-12 h-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-8 text-[12px] font-extrabold shadow-inner relative z-10`}>
                                {step.num}
                            </div>
                            <h3 className="font-extrabold text-white text-xl uppercase tracking-tight mb-3 relative z-10">{step.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed font-medium relative z-10 max-w-sm">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Projects Preview ─────────────────────────────────────────────────────────
function ProjectsSection() {
    const projects = [
        {
            tag: 'NLP', status: 'Under Review', title: 'Grievance AI Classifier',
            desc: 'Automatically classifies citizen grievances into relevant government departments with 90%+ accuracy using transformer models.',
            votes: 34, statusBg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
        },
        {
            tag: 'Vision', status: 'Approved', title: 'Document OCR Verifier',
            desc: 'Extracts and verifies data from government documents — marksheets, certificates — using AI vision models.',
            votes: 28, statusBg: 'bg-primary-500/10 text-primary-400 border-primary-500/30',
        },
        {
            tag: 'Data', status: 'Open', title: 'Service Analytics Dashboard',
            desc: 'Real-time insights on public service performance metrics to drive evidence-based governance decisions.',
            votes: 19, statusBg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        },
    ];

    return (
        <section className="py-32 relative" id="projects">
            <div className="absolute inset-0 bg-black/60 z-0" />
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-16">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6 backdrop-blur-md">
                            Featured Projects
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">Innovation<br /><span className="text-gray-500">in Progress.</span></h2>
                    </div>
                    <Link href="/login"
                        className="btn-secondary py-3 px-6 text-[11px] font-bold uppercase tracking-widest flex-shrink-0">
                        View All Projects →
                    </Link>
                </div>

                {/* Phase stepper */}
                <div className="flex items-center gap-2 mb-10 max-w-xl">
                    {[
                        { lbl: 'Phase 1: Training', done: true },
                        { lbl: 'Phase 2: Pilots', active: true },
                        { lbl: 'Phase 3: Deploy', done: false },
                    ].map((p, i, arr) => (
                        <div key={i} className="flex items-center flex-1 min-w-0">
                            <div className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 transition-all ${p.active ? 'bg-primary-500/20 border-primary-500/50 text-primary-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : p.done ? 'bg-white/10 border-white/20 text-gray-300'
                                    : 'bg-white/5 border-white/5 text-gray-500'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.active ? 'bg-primary-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : p.done ? 'bg-gray-400' : 'bg-gray-600'}`} />
                                <span className="truncate">{p.lbl}</span>
                            </div>
                            {i < arr.length - 1 && <div className={`h-px flex-1 mx-2 ${p.done ? 'bg-white/20' : 'bg-white/5'}`} />}
                        </div>
                    ))}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {projects.map((proj, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 group hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${proj.statusBg}`}>
                                        {proj.status}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{proj.tag}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-primary-500 text-xs font-extrabold bg-primary-500/10 px-2 py-1 rounded-md border border-primary-500/20">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                    </svg>
                                    {proj.votes}
                                </div>
                            </div>
                            <h4 className="font-extrabold text-white text-lg uppercase tracking-tight mb-3 relative z-10 group-hover:text-primary-400 transition-colors">{proj.title}</h4>
                            <p className="text-gray-400 text-sm leading-relaxed font-medium relative z-10">{proj.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Tech Feed Preview ────────────────────────────────────────────────────────
function TechFeedPreview() {
    const newsItems = [
        {
            category: 'LLM', catBg: 'bg-gray-700/30 text-gray-300 border-gray-500/30',
            source: 'DeepMind Blog', time: '2h ago',
            title: 'Gemini 2.0 achieves state-of-the-art results on government document understanding benchmarks',
            summary: 'New multimodal capabilities allow Gemini to process complex tables and handwritten forms across multiple Indian languages.',
        },
        {
            category: 'Agents', catBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            source: 'OpenAI Research', time: '5h ago',
            title: 'Agentic AI systems now capable of end-to-end form processing without human intervention',
            summary: 'Autonomous agents can fill, verify, and submit government forms with 94% accuracy in controlled tests.',
        },
        {
            category: 'Vision', catBg: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
            source: 'Papers With Code', time: '1d ago',
            title: 'New OCR model outperforms Tesseract on handwritten Hindi and Devanagari script recognition',
            summary: 'CRNN-based model achieves 97.2% character accuracy on IIIT-HW-Dev dataset, suitable for offline document digitization.',
        },
        {
            category: 'Research', catBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
            source: 'Google AI Blog', time: '2d ago',
            title: 'Responsible AI frameworks for public sector adoption — lessons from 12 government deployments',
            summary: 'Study covers bias mitigation, explainability, and audit trails required for AI in citizen-facing services.',
        },
    ];

    return (
        <section className="py-32 relative" id="ai-news">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl z-0" />
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> Live Intelligence Feed
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">Latest from<br /><span className="text-gray-500">the AI World.</span></h2>
                        <p className="text-gray-400 mt-4 text-sm font-medium">Curated AI research &amp; news relevant to government tech — updated daily.</p>
                    </div>
                    <Link href="/login"
                        className="btn-secondary py-3 px-6 text-[11px] font-bold uppercase tracking-widest flex-shrink-0">
                        Full Feed →
                    </Link>
                </div>

                {/* Category chips */}
                <div className="flex flex-wrap gap-3 mb-12">
                    {['All', 'LLM', 'Vision', 'Agents', 'Research', 'Infra', 'Tools', 'Industry'].map((cat, i) => (
                        <span key={cat} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors cursor-default ${i === 0 ? 'bg-primary-500/20 text-primary-400 border-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                            {cat}
                        </span>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {newsItems.map((item, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 group hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest ${item.catBg}`}>
                                    {item.category}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-400 font-bold tracking-wider uppercase">{item.source}</span>
                                    <span className="text-gray-600">·</span>
                                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{item.time}</span>
                                </div>
                            </div>
                            <h4 className="font-extrabold text-white text-lg leading-snug mb-3 relative z-10 group-hover:text-primary-400 transition-colors">
                                {item.title}
                            </h4>
                            <p className="text-gray-400 text-sm leading-relaxed font-medium relative z-10">{item.summary}</p>
                            <div className="mt-5 flex items-center gap-2 text-primary-500 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity relative z-10 bg-primary-500/10 self-start px-3 py-1.5 rounded-lg border border-primary-500/20 w-max">
                                <Link href="/login">Read after sign in</Link>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/login"
                        className="btn-secondary py-4 px-8 text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-3">
                        <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Sign in to access full AI intelligence feed
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ─── About / Impact ───────────────────────────────────────────────────────────
function AboutSection() {
    return (
        <section className="py-32 relative" id="impact">
            <div className="absolute inset-0 bg-black/60 z-0" />
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6 backdrop-blur-md">
                        Our Impact Goals
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">Built for<br /><span className="text-gray-500">Measurable Results.</span></h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Vision */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 group hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl">
                        <div className="flex items-center gap-5 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 text-2xl">
                                👁
                            </div>
                            <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight">Our Vision</h3>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-base font-medium relative z-10">
                            To become a government-focused AI Innovation hub that builds intelligent solutions to enhance{' '}
                            <span className="text-primary-400 font-extrabold">transparency</span>,{' '}
                            <span className="text-primary-400 font-extrabold">efficiency</span>, and citizen services across Madhya Pradesh.
                        </p>
                    </div>

                    {/* Mission */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 group hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl">
                        <div className="flex items-center gap-5 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 text-2xl">
                                🎯
                            </div>
                            <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight">Our Mission</h3>
                        </div>
                        <ul className="space-y-4 relative z-10">
                            {[
                                ['Develop AI-driven ', 'automation', ' for public service portals'],
                                ['Upskill internal teams in practical AI implementation'],
                                ['Build ', 'reusable AI models', ' and APIs for government use'],
                                ['Promote ', 'innovation', ' through open collaboration'],
                            ].map(([pre, hl, suf], i) => (
                                <li key={i} className="flex items-start gap-4 text-gray-400 text-base font-medium">
                                    <span className="mt-2 w-2 h-2 flex-shrink-0 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                    <span>{pre}{hl && <span className="text-white font-extrabold">{hl}</span>}{suf}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Impact stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { icon: '⏱', val: '40%', lbl: 'Less Manual Work', bg: 'bg-primary-500/10 text-primary-500 border-primary-500/20' },
                        { icon: '🎯', val: '90%+', lbl: 'AI Accuracy', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                        { icon: '📄', val: 'Enable', lbl: 'AI Doc Verification', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                        { icon: '🚀', val: 'Deploy', lbl: '5 AI Solutions/Year', bg: 'bg-gray-500/10 text-gray-300 border-gray-500/20' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center group hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 backdrop-blur-md">
                            <div className={`w-12 h-12 rounded-xl ${s.bg} border flex items-center justify-center mb-5 text-xl mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                                {s.icon}
                            </div>
                            <div className="text-3xl font-extrabold text-white mb-1 group-hover:text-primary-400 transition-colors duration-500">{s.val}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-snug">{s.lbl}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
    return (
        <section className="py-32 relative overflow-hidden bg-black">
             {/* Center Glow */}
             <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-primary-500/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
             
            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                    <AILogo size={24} />
                    MPOnline AI Innovation Club
                </div>
                <h2 className="text-5xl md:text-6xl font-extrabold text-white uppercase tracking-tight mb-8">Ready to Build<br />the <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-amber-600">Future?</span></h2>
                <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                    Submit ideas, collaborate with peers, and help shape government-grade AI solutions for Madhya Pradesh.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                    <Link href="/signup"
                        className="btn-primary px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all hover:-translate-y-1">
                        Apply for Membership
                    </Link>
                    <Link href="/login"
                        className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md hover:-translate-y-1">
                        Sign In
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="bg-black border-t border-white/10 py-12">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                    <AILogo size={40} />
                    <div>
                        <span className="text-white font-extrabold text-sm uppercase tracking-tight block">MPOnline AI Foundation Club</span>
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">@RenuDeshmukh &mdash; &copy; 2026</span>
                    </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap justify-center">
                    {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Projects', '#projects'], ['AI News', '#ai-news'], ['Impact', '#impact']].map(([lbl, href]) => (
                        <a key={lbl} href={href} className="text-gray-500 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors">{lbl}</a>
                    ))}
                    <Link href="/login" className="text-primary-500 hover:text-primary-400 text-[11px] font-bold uppercase tracking-widest transition-colors ml-4">Login →</Link>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    // While auth is loading or user is logged in, show spinner
    if (authLoading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-6">
                    <AILogo size={64} />
                    <div className="w-6 h-6 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black dark:bg-black light:bg-gray-50 text-white light:text-black transition-colors duration-500 selection:bg-accent-500/30 selection:text-white">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <ProjectsSection />
            <TechFeedPreview />
            <AboutSection />
            <CTASection />
            <Footer />
        </main>
    );
}
