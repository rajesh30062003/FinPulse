import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Server, Globe, ExternalLink, RefreshCw, Check, Settings2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { getApiBase, setCustomApiUrl, api } from '../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, refreshAll, clearFinancialData } = useFinancial();
  const { user, login, register, logout, verifyEmail, forgotPassword, resetPassword, isAuthenticated } = useAuth();

  const [tab, setTab] = useState<'account' | 'login' | 'register' | 'verify' | 'forgot' | 'reset'>('account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Backend connection state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{ online?: boolean; msg?: string } | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setBackendUrlInput(localStorage.getItem('finpulse_api_url') || (import.meta.env.VITE_API_URL as string) || '');
      if (isAuthenticated) {
        setTab('account');
      } else {
        setTab('login');
      }
    }
  }, [isAuthModalOpen, isAuthenticated]);

  const testAndSaveBackend = async () => {
    setIsTestingBackend(true);
    setBackendStatus(null);
    try {
      const urlToTest = backendUrlInput.trim();
      if (!urlToTest) {
        setCustomApiUrl(null);
        setBackendStatus({ online: true, msg: 'Reset to default relative API (/api)' });
        return;
      }
      let target = urlToTest.replace(/\/+$/, '');
      if (!target.endsWith('/api')) {
        target = `${target}/api`;
      }
      const testRes = await fetch(`${target}/health`, { headers: { Accept: 'application/json' } });
      const ct = testRes.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${testRes.status}). Verify this is your Render backend.`);
      }
      const json = await testRes.json();
      if (json.status === 'ok') {
        setCustomApiUrl(urlToTest);
        setBackendStatus({ online: true, msg: `Connected successfully! (${json.service || 'Backend OK'})` });
        setError(null);
      } else {
        throw new Error('Health check returned unexpected payload');
      }
    } catch (err: any) {
      setBackendStatus({ online: false, msg: err.message || 'Failed to connect to Render backend' });
    } finally {
      setIsTestingBackend(false);
    }
  };

  if (!isAuthModalOpen) return null;

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      clearFinancialData();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await login(email, password);
      await refreshAll();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const res = await register(name, email, password, confirmPassword);
      setSuccess(res.message || 'Verification code sent to email.');
      setTab('verify');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await verifyEmail(email || user?.email || '', otp);
      setSuccess('Email successfully verified! Your account is fully secured.');
      await refreshAll();
      setTimeout(() => setIsAuthModalOpen(false), 1200);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await forgotPassword(email);
      setSuccess('Password recovery code dispatched to your email.');
      setTab('reset');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await resetPassword(email, newPassword, otp);
      setSuccess('Password reset successfully! You can now log in.');
      setTab('login');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {tab === 'account' && 'Account Profile & Security'}
              {tab === 'login' && 'Account Login'}
              {tab === 'register' && 'Create FinPulse Account'}
              {tab === 'verify' && 'Verify Email Address'}
              {tab === 'forgot' && 'Forgot Password Recovery'}
              {tab === 'reset' && 'Set New Password'}
            </h2>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ACTIVE ACCOUNT VIEW */}
          {tab === 'account' && user && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-slate-500 font-mono text-[11px]">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {user.isVerified ? 'Email Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Currency:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{user.currency || 'INR (₹)'}</span>
                  </div>
                </div>
              </div>

              {!user.isVerified && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-between">
                  <span>Email not yet confirmed</span>
                  <button
                    onClick={() => { setEmail(user.email); setTab('verify'); }}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Enter Code
                  </button>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loading ? 'Logging Out...' : 'Sign Out / Invalidate Session'}</span>
                </button>
              </div>
            </div>
          )}

          {/* VERIFY EMAIL FORM */}
          {tab === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter the 6-digit verification code sent to your email.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="849201"
                  className="w-full py-2.5 text-center text-xl font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}

          {/* Footer Info & Backend Status */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 truncate max-w-[240px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">API: {getApiBase()}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <Server className="w-3 h-3" />
              <span>{showServerConfig ? 'Hide Config' : 'Change Backend'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
