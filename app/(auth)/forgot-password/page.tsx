'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const { resetPassword } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');
        setMessage('');

        const result = await resetPassword(email);

        if (result.error) {
            setStatus('error');
            setMessage(result.error);
        } else {
            setStatus('success');
            setMessage('A password reset link has been sent to your email.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 light:bg-gray-50 relative overflow-hidden font-sans selection:bg-accent-500/30 py-4 sm:py-8 lg:py-0 transition-colors duration-500">

            {/* Floating Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-2xl bg-white/[0.03] light:bg-black/5 border border-white/10 light:border-black/10 hover:bg-white/[0.08] light:hover:bg-black/10 transition-all group shadow-xl backdrop-blur-md"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <svg className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M6.343 6.343l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </div>
            {/* Ambient Animated Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-accent-900/40 blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary-900/20 blur-[100px]"
                />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                {/* Subtle dot matrix grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col items-center justify-center relative z-10">
                {/* Center Config: Glassmorphic Form Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full lg:w-[460px] relative max-w-md mx-auto"
                >
                    {/* Glowing border effect */}
                    <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-b from-white/20 to-white/0 opacity-50 blur-sm pointer-events-none"></div>

                    <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-[32px] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                        {/* Inner subtle glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-accent-500/50 to-transparent"></div>

                        <div className="mb-8 text-center">
                            <div className="flex justify-center mb-6">
                                <img
                                    src="/logo.png"
                                    alt="AiClub Logo"
                                    className="w-12 h-12 object-contain shadow-2xl"
                                />
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">Recover Access</h2>
                            <p className="text-gray-400 mt-2 text-sm font-medium">Enter your email to receive a password reset link.</p>
                        </div>

                        {status === 'error' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {message}
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-accent-500/10 border border-accent-500/30 text-accent-400 p-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {message}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all placeholder:text-gray-600"
                                    placeholder="name@AiClub.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="relative w-full py-4 mt-2 rounded-2xl bg-accent-500 hover:bg-accent-400 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 group overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {/* Button Glow */}
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                {status === 'loading' ? (
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                                ) : (
                                    <span className="relative z-10 flex items-center gap-2">
                                        Send Reset Link
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
                            <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Return to Login
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
