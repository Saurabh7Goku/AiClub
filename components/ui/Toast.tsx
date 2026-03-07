'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  duration?: number; // in ms
  onClose: () => void;
}

export default function Toast({ message, duration = 2000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Start animation
    setVisible(true);
    setAnimating(true);

    // After 2 seconds, start slide out
    const timer = setTimeout(() => {
      setAnimating(false);
      // After animation, close
      setTimeout(() => {
        setVisible(false);
        onClose();
      }, 300); // animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
        animating ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <p className="text-white font-medium text-sm">{message}</p>
    </div>
  );
}
