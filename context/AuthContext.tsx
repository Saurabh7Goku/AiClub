'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { subscribeToAuthChanges, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, signInWithGoogle as firebaseSignInWithGoogle, resetPassword as firebaseResetPassword } from '@/lib/firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  isLeader: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user, isLoading) => {
      setUser(user);
      setLoading(isLoading);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const result = await firebaseSignIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return { error: result.error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(null);
    const result = await firebaseSignUp(email, password, displayName);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return { error: result.error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await firebaseSignInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return { error: result.error };
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await firebaseSignOut();
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return { error: result.error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    const result = await firebaseResetPassword(email);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return { error: result.error };
  }, []);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        isLeader,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
