import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Server, Globe, ExternalLink, RefreshCw, Check, Settings2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { getApiBase, setCustomApiUrl, api } from '../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, refreshAll, setIsMailboxOpen } = useFinancial();
  const { user, login, register, logout, verifyEmail, forgotPassword, resetPassword } = useAuth();

  const [tab, setTab] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Backend connection state for troubleshooting Vercel -> Render integration
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{ online?: boolean; msg?: string } | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setBackendUrlInput(localStorage.getItem('finpulse_api_url') || (import.meta.env.VITE_API_URL as string) || '');
    }
  }, [isAuthModalOpen]);

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
    try {
      setLoading(true);
      const res = await register(name, email, password);
      await refreshAll();
      setSuccess('Account created! Verification code sent to email.');
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
      await verifyEmail(token || undefined, otp);
      setSuccess('Email successfully verified! Your account is fully secured.');
      await refreshAll();
      setTimeout(() => setIsAuthModalOpen(false), 1500);
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
      setSuccess('Password recovery code dispatched! Check your email or sandbox mailbox.');
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
      await resetPassword(email, newPassword, token || undefined, otp);
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

        {/* Tab switch for Login / Register */}
        {(tab === 'login' || tab === 'register') && (
          <div className="grid grid-cols-2 p-1 mx-6 mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => { setTab('login'); setError(null); setSuccess(null); }}
              className={`py-1.5 rounded-md transition-colors ${tab === 'login' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); setSuccess(null); }}
              className={`py-1.5 rounded-md transition-colors ${tab === 'register' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>
        )}

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
              {(error.includes('HTML') || error.includes('Render') || error.includes('Vercel') || error.includes('Cannot connect')) && (
                <div className="pt-2 border-t border-red-200/60 dark:border-red-800/60">
                  <button
                    type="button"
                    onClick={() => setShowServerConfig(true)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure Render Backend URL in Browser
                  </button>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Render Backend Connection Drawer / Panel */}
          {showServerConfig && (
            <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-300">
                  <Server className="w-3.5 h-3.5" />
                  <span>Render Backend Endpoint</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                If your frontend is on Vercel and your backend is on Render, enter your live Render URL below:
              </p>
              <div className="space-y-1.5">
                <input
                  type="url"
                  value={backendUrlInput}
                  onChange={e => setBackendUrlInput(e.target.value)}
                  placeholder="https://finpulse-backend.onrender.com"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={testAndSaveBackend}
                    disabled={isTestingBackend}
                    className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isTestingBackend ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Testing Health...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Test & Connect</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackendUrlInput('');
                      setCustomApiUrl(null);
                      setBackendStatus({ online: true, msg: 'Reset to default relative API (/api)' });
                    }}
                    className="px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md"
                  >
                    Reset
                  </button>
                </div>
              </div>
              {backendStatus && (
                <div className={`p-2 rounded text-[11px] ${backendStatus.online ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' : 'bg-red-100/80 dark:bg-red-950/80 text-red-800 dark:text-red-200'}`}>
                  {backendStatus.msg}
                </div>
              )}
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(null); }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="pt-2 text-center text-slate-500">
                <span>Currently signed in as: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email || 'Demo User'}</span>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors mt-2"
              >
                {loading ? 'Creating Account...' : 'Register & Send Code'}
              </button>
            </form>
          )}

          {/* VERIFY EMAIL FORM */}
          {tab === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter the 6-digit verification code sent to your email. You can also view it in the <strong>Email Sandbox Mailbox</strong>.
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMailboxOpen(true)}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  View in Sandbox
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter your email address to receive an automated secure password reset code.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              >
                {loading ? 'Sending...' : 'Send Recovery Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-slate-500 hover:underline"
                >
                  Cancel & Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {tab === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  6-Digit Reset Code (From Email / Sandbox)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full py-2 text-center text-lg font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMailboxOpen(true)}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  View Code
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
