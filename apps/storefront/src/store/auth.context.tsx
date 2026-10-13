'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { auth } from '@/lib/api-client';
import type { User } from '@/lib/api-client';

const AuthModal = dynamic(
  () => import('../components/auth/AuthModal').then((mod) => mod.AuthModal),
  { ssr: false }
);

export function resolveStorageEvent(e: { key: string | null; newValue: string | null }): 'refresh' | 'clear' | 'noop' {
  if (e.key === 'auth_hint') {
    return e.newValue ? 'refresh' : 'clear';
  }
  if (e.key === null) {
    return 'clear';
  }
  return 'noop';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: (options?: { force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reqIdRef = useRef(0);

  const refreshUser = async (options?: { force?: boolean }) => {
    // Only attempt profile retrieval if we have an active auth hint in storage (or force: true)
    // to prevent spurious 401 console errors for anonymous visitors.
    if (!options?.force && typeof window !== 'undefined' && !localStorage.getItem('auth_hint')) {
      setIsLoading(false);
      return;
    }

    const currentReqId = ++reqIdRef.current;

    try {
      const res = await auth.getMe();
      if (currentReqId !== reqIdRef.current) return;

      if (res.success && res.data) {
        setUser(res.data.user);
        if (typeof window !== 'undefined' && localStorage.getItem('auth_hint') !== 'true') {
          localStorage.setItem('auth_hint', 'true');
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_hint');
        }
      }
    } catch {
      if (currentReqId !== reqIdRef.current) return;
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_hint');
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshUser();

    // Synchronize authentication state across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      const action = resolveStorageEvent(e);
      if (action === 'refresh') {
        refreshUser({ force: true });
      } else if (action === 'clear') {
        reqIdRef.current++;
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = () => {
    setIsModalOpen(true);
  };

  const logout = async () => {
    reqIdRef.current++;
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_hint');
      }
    }
  };

  const handleLoginSuccess = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_hint', 'true');
    }
    await refreshUser();
    setIsModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
      {isModalOpen && (
        <AuthModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
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
