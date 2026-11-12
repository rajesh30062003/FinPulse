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
  register: (name: string, email: string, pass: string, confirmPassword?: string) => Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string; user?: any }>;
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

  // Verify and restore session once on page mount or refresh
  const checkSession = useCallback(async () => {
    setSessionState('checking');
    try {
      // 1. Single session restoration attempt using HttpOnly refresh token cookie
      const res = await api.refresh();
      if (res && res.user) {
        setUser(res.user);
        setSessionState('authenticated');
        return;
      }
    } catch {
      // Refresh failed (401 is expected for logged-out visitors; no cookie exists)
    }

    // Mark as unauthenticated immediately without attempting redundant calls
    clearTokens();
    setUser(null);
    setSessionState('unauthenticated');
  }, []);

  // Dedicated profile refresh for actively authenticated users
  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.getMe();
      if (profile && profile.id) {
        setUser(profile);
      }
    } catch {
      await checkSession();
    }
  }, [checkSession]);

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
    if (res && res.user) {
      setUser(res.user);
      setSessionState('authenticated');
    }
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
        refreshUser
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
