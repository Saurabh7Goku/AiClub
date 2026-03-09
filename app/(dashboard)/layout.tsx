'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (!loading && user && !user.profile?.onboardingComplete && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
    // Close mobile sidebar on route change
    setIsMobileOpen(false);
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] animate-pulse">Initializing Interface...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-[rgb(var(--foreground-rgb))] transition-colors duration-500 overflow-x-hidden selection:bg-accent-500/30">

      {/* Ambient Animated Background (Subtle) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-accent-500/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[30%] h-[30%] bg-primary-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <motion.div
        animate={{
          paddingLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
            ? (isCollapsed ? 88 : 256)
            : 0
        }}
        className={`flex flex-col ${pathname.startsWith('/chat') ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'} transition-all duration-300 ease-in-out`}
      >
        <Header setIsMobileOpen={setIsMobileOpen} />

        <main className={`relative w-full flex-1 flex flex-col ${pathname.startsWith('/chat') ? 'px-2 py-2 pb-4 overflow-hidden' : 'px-4 sm:px-6 lg:px-8 py-8'}`}>
          <div className={`${pathname.startsWith('/chat') ? 'flex-1 flex flex-col min-h-0' : 'animate-elevator-in'}`}>
            {children}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
