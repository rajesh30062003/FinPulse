import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser } from '../types';
import { api, clearTokens, getRefreshToken } from '../services/api';

export type SessionState = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: IUser | null;
  sessionState: SessionState;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, confirmPassword?: string) => Promise<{ success: boolean; message: string; email: string; expiresInSeconds: number }>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<{ success: boolean; message: string; expiresInSeconds: number }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, pass: string, otp: string, confirmPassword?: string) => Promise<void>;
  checkSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('checking');

  // Verify and restore session on page mount or refresh
  const checkSession = useCallback(async () => {
    setSessionState('checking');
    try {
      // 1. Try refresh endpoint first (uses HttpOnly cookie or x-refresh-token header)
      const res = await api.refresh();
      if (res && res.user) {
        setUser(res.user);
        setSessionState('authenticated');
        return;
      }
    } catch (refreshErr) {
      // Refresh token might not exist or might be expired
    }

    try {
      // 2. Fallback check: attempt getMe if any valid in-memory/cookie session exists
      const profile = await api.getMe();
      if (profile && profile.id) {
        setUser(profile);
        setSessionState('authenticated');
        return;
      }
    } catch (profileErr) {
      // Unauthenticated session confirmed
    }

    // Unauthenticated state
    clearTokens();
    setUser(null);
    setSessionState('unauthenticated');
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setUser(res.user);
    setSessionState('authenticated');
  };

  const register = async (name: string, email: string, pass: string, confirmPassword?: string) => {
    const res = await api.register({
      name,
      email,
      password: pass,
      confirmPassword: confirmPassword || pass
    });
    return res;
  };

  const verifyEmail = async (email: string, otp: string) => {
    const res = await api.verifyEmail({ email, otp });
    setUser(res.user);
    setSessionState('authenticated');
  };

  const resendOtp = async (email: string) => {
    return api.resendOtp(email);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearTokens();
      setUser(null);
      setSessionState('unauthenticated');
    }
  };

  const forgotPassword = async (email: string) => {
    return api.forgotPassword(email);
  };

  const resetPassword = async (email: string, pass: string, otp: string, confirmPassword?: string) => {
    await api.resetPassword({
      email,
      otp,
      newPassword: pass,
      confirmPassword: confirmPassword || pass
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionState,
        isAuthenticated: sessionState === 'authenticated' && !!user,
        isLoading: sessionState === 'checking',
        login,
        register,
        verifyEmail,
        resendOtp,
        logout,
        forgotPassword,
        resetPassword,
        checkSession,
        refreshUser: checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
