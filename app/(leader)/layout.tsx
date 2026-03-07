'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isLeader } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (!loading && user && !isLeader) {
      router.push('/');
    }
    // Close mobile sidebar on route change
    setIsMobileOpen(false);
  }, [user, loading, isLeader, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Initializing Interface...</p>
      </div>
    );
  }

  if (!user || !isLeader) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 transition-colors duration-500 overflow-x-hidden selection:bg-accent-500/30">

      {/* Ambient Animated Background (Subtle) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-900/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay"></div>
      </div>

      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
      />
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ 
          paddingLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 
            ? (isCollapsed ? 88 : 256) 
            : 0 
        }}
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
      >
        <Header setIsMobileOpen={setIsMobileOpen} />

        <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="animate-elevator-in">
            {children}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
