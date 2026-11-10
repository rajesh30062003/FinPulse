import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<{ otpSent?: string }>;
  logout: () => void;
  verifyEmail: (token?: string, otp?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ otpPreview?: string }>;
  resetPassword: (email: string, pass: string, token?: string, otp?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('finpulse_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      // If error or token expired, keep demo user from API
      console.warn('User session check:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setToken(res.token);
    localStorage.setItem('finpulse_token', res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register({ name, email, password: pass });
    setToken(res.token);
    localStorage.setItem('finpulse_token', res.token);
    setUser(res.user);
    return { otpSent: res.otpSent };
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('finpulse_token');
    refreshUser(); // reload demo state if available
  };

  const verifyEmail = async (verifyToken?: string, otp?: string) => {
    if (!user) throw new Error('No active user to verify');
    const res = await api.verifyEmail({ email: user.email, token: verifyToken, otp });
    setUser(res.user);
  };

  const forgotPassword = async (email: string) => {
    const res = await api.forgotPassword(email);
    return { otpPreview: res.otpPreview };
  };

  const resetPassword = async (email: string, pass: string, resetToken?: string, otp?: string) => {
    await api.resetPassword({ email, newPassword: pass, token: resetToken, otp });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
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
