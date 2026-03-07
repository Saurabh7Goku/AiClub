'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import { motion } from 'framer-motion';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.push('/dashboard');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreeTerms) { setError('Please agree to the membership terms'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const result = await signUp(email, password, displayName);
    if (result.error) { setError(result.error); setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const result = await signInWithGoogle();
    if (result.error) { setError(result.error); setGoogleLoading(false); }
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
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary-900/30 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -top-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-accent-900/40 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 relative z-10">

        {/* Left Config: Hero & Value Prop */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8"
        >
          {/* Glowing Badge Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-accent-500/20 group-hover:bg-accent-500/40 transition-colors duration-500"></div>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent-400 to-accent-600 font-bold text-lg lg:text-2xl tracking-tighter relative z-10 transition-transform duration-500 group-hover:scale-110">AI</span>
            </div>
            <div className="text-left">
              <span className="font-extrabold text-lg lg:text-xl text-white tracking-tight uppercase block leading-tight">AiClub AI</span>
              <span className="text-[9px] lg:text-[10px] font-bold text-accent-400 uppercase tracking-[0.3em] leading-none">Foundation Club</span>
            </div>
          </div>

          <div className="space-y-3 lg:space-y-5">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tighter">
              Shape the <br />
              Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-accent-600">GenAI.</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
              Establish your identity within the premier AI research community. Contribute, collaborate, and build impact.
            </p>
          </div>

          {/* Premium Feature List (Hidden on very small screens to save space) */}
          <div className="hidden sm:grid grid-cols-2 gap-3 w-full max-w-md mx-auto lg:mx-0">
            {[
              { icon: '🛡️', label: 'Verified Identity', delay: 0.1 },
              { icon: '🚀', label: 'Submit Projects', delay: 0.2 },
              { icon: '⚖️', label: 'Peer Governance', delay: 0.3 },
              { icon: '🤖', label: 'AI Assistance', delay: 0.4 },
            ].map((feature, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + feature.delay }}
                key={idx}
                className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-sm shadow-inner flex-shrink-0">
                  {feature.icon}
                </div>
                <span className="text-gray-300 text-xs sm:text-sm font-semibold tracking-wide truncate">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Config: Glassmorphic Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="w-full lg:w-[460px] relative max-w-md mx-auto lg:mx-0"
        >
          {/* Glowing border effect */}
          <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-b from-white/20 to-white/0 opacity-50 blur-sm pointer-events-none"></div>

          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-[28px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">

            {/* Inner subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-accent-500/50 to-transparent"></div>

            <div className="mb-5 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Create Profile</h2>
              <p className="text-gray-400 mt-1 text-sm font-medium">Initialize your membership protocol.</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-all placeholder:text-gray-600"
                  placeholder="Saurabh Singh"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-all placeholder:text-gray-600"
                  placeholder="name@AiClub.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-all placeholder:text-gray-600 font-mono"
                    placeholder="Min 6 chars"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-all placeholder:text-gray-600 font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 mt-1 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded flex-shrink-0 border-gray-600 bg-black/50 checked:bg-accent-500 focus:ring-accent-500/30 transition-all cursor-pointer accent-accent-500"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-gray-400 leading-snug cursor-pointer select-none">
                  I acknowledge the <span className="text-white font-semibold">Governance Protocol</span> and agree to the research terms.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="relative w-full py-3 mt-1 rounded-xl bg-accent-500 hover:bg-accent-400 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 group overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              >
                {/* Button Glow */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    Initialize Profile
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">OR</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="mt-5 w-full py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </>
              )}
            </button>

            <p className="mt-5 text-center text-gray-400 text-[11px] font-medium">
              Already verified?{' '}
              <Link href="/login" className="text-white font-bold hover:text-accent-400 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-accent-500/50">
                Return to Login
              </Link>
            </p>

          </div>
        </motion.div>
      </div>

    </div>
  );
}
