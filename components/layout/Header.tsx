'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import GlobalSearch from '@/components/layout/GlobalSearch';

interface HeaderProps {
  setIsMobileOpen?: (value: boolean) => void;
}

export default function Header({ setIsMobileOpen }: HeaderProps) {
  const { user, loading, signOut, isLeader, isAdmin } = useAuth();
  const { currentClub, clubs, selectClub } = useClub();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-400 ${scrolled
      ? 'py-2 bg-background border-b border-white/10 shadow-lg'
      : 'py-4 bg-transparent'
      }`}>
      <div className="w-full px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between items-center h-12">
          {/* Left Side: Breadcrumbs or Page Context */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-6 bg-accent-500 rounded-full" />
              <span className="text-sm font-bold uppercase tracking-widest opacity-80 truncate max-w-[calc(100vw-180px)] sm:max-w-none">
                {pathname === '/' ? 'Nodes.Summary' : pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('.')}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center max-w-md mx-4">
            <GlobalSearch />
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4 relative">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/10 group"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M6.343 6.343l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {loading ? (
              <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-all border border-accent-500/20 hover:border-accent-500/40 dark:border-white/20 dark:hover:border-white/30 group"
                >
                  <div className="w-9 h-9 bg-black/20 border border-white/10 rounded-lg flex items-center justify-center group-hover:border-accent-500/50 transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-accent-500/15 group-hover:bg-accent-500/50 dark:bg-accent-500/15 dark:group-hover:bg-accent-500/20 transition-colors"></div>
                    <span className="font-bold text-xs relative z-10">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-none transition-all">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {user.displayName.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-semibold text-accent-500 uppercase tracking-widest mt-1">
                      {user.role}
                    </span>
                  </div>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-5 w-64 bg-white dark:bg-gray-950 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-elevator-in z-50 !opacity-100">
                      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                        <p className="text-xs font-bold truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] font-medium opacity-50 truncate mt-0.5">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-3 text-[10px] font-bold tracking-wider text-gray-300 hover:bg-white/[0.04] hover:text-accent-400 transition-colors group"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        PROFILE
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-4 py-3 text-[10px] font-bold tracking-wider text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group border-t border-white/5"
                      >
                        <svg className="w-4 h-4 mr-3 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        SIGN OUT
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="relative py-2 px-5 text-[10px] font-bold uppercase tracking-wider bg-accent-500 hover:bg-accent-400 text-black rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="relative z-10">Sign In</span>
              </Link>
            )}

            {/* Mobile Sidebar Toggle Button */}
            <button
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] text-gray-400 hover:text-white border border-white/10 hover:bg-white/[0.08] transition-colors"
              onClick={() => setIsMobileOpen && setIsMobileOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
