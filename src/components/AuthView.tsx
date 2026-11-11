import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Server,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiBase, setCustomApiUrl } from '../services/api';

export const AuthView: React.FC = () => {
  const { login, register, verifyEmail, resendOtp, forgotPassword, resetPassword } = useAuth();

  const [tab, setTab] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // OTP Timer & Resend Cooldown
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300); // 5 minutes
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(60); // 60 seconds

  const maskEmail = (raw: string) => {
    if (!raw || !raw.includes('@')) return raw;
    const [userPart, domainPart] = raw.split('@');
    if (userPart.length <= 2) return `${userPart[0]}*@${domainPart}`;
    const masked = userPart[0] + '*'.repeat(Math.min(userPart.length - 2, 6)) + userPart.slice(-1);
    return `${masked}@${domainPart}`;
  };

  // Backend connection drawer
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{ online?: boolean; msg?: string } | null>(null);

  useEffect(() => {
    setBackendUrlInput(localStorage.getItem('finpulse_api_url') || (import.meta.env.VITE_API_URL as string) || '');
  }, []);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (tab !== 'verify') return;
    const interval = setInterval(() => {
      setOtpExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tab]);

  // Cooldown timer for Resend OTP
  useEffect(() => {
    if (tab !== 'verify') return;
    const interval = setInterval(() => {
      setResendCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tab]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
        throw new Error(`Server returned non-JSON response (${testRes.status}). Verify this is your Render backend URL.`);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      if (err.data?.unverified) {
        setTab('verify');
        setError('Your email is not verified yet. Please enter the 6-digit code or request a new one.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    try {
      setLoading(true);
      const res = await register(name, email, password, confirmPassword);
      setSuccess(res.message || 'Account registration initiated! Verification code dispatched to your email.');
      setOtpExpirySeconds(res.expiresInSeconds || 300);
      setResendCooldownSeconds(60);
      setOtp('');
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
    setSuccess(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      await verifyEmail(email, otp.trim());
      setSuccess('Account activated and verified! Redirecting to your financial vault...');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldownSeconds > 0) return;
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      const res = await resendOtp(email);
      setSuccess(res.message || 'A fresh verification code has been dispatched.');
      setOtpExpirySeconds(res.expiresInSeconds || 300);
      setResendCooldownSeconds(60);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      const res = await forgotPassword(email);
      setSuccess(res.message || 'Password recovery code dispatched to your email.');
      setOtp('');
      setTab('reset');
    } catch (err: any) {
      setError(err.message || 'Password recovery request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email, newPassword, otp.trim(), confirmNewPassword);
      setSuccess('Password updated successfully! You can now sign in with your new credentials.');
      setPassword('');
      setTab('login');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('rajesh@finpulse.local');
    setPassword('Test@12345');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Bar with brand and server health */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20 border border-blue-400/30">
            FP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl text-white tracking-tight">FinPulse</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Vault
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Double-Entry Financial Accounting System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">API Config</span>
          </button>
        </div>
      </header>

      {/* Main Content: Split Hero & Auth Card */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Privacy & Architecture Guarantee */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Strict Zero-Knowledge Financial Privacy Active</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Autonomous Personal Ledger &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">Cryptographic Financial Vault</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Every balance, credit card cycle, emergency reserve, and transaction is strictly isolated to your authenticated profile. Authentication is cryptographically verified with rotating refresh tokens and automated Nodemailer email validation.
            </p>
          </div>

          {/* Privacy & Security Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Zero Exposure Dashboard</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Financial data is never fetched or rendered without an authenticated session token.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Brevo SMTP OTP (Port 2525)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Strict 5-minute hashed OTP verification dispatched via Brevo SMTP on port 2525 with STARTTLS to safely bypass Render Free port blocks.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span>Dual Token Persistence</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Rotated refresh tokens in HttpOnly cookies with cross-domain header fallback for Vercel + Render.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Brute-Force Lockout</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Accounts automatically enter a 15-minute temporary lockout after 5 consecutive failed attempts.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Authentication Card */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Server connection drawer */}
            {showServerConfig && (
              <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-400">
                    <Server className="w-4 h-4" />
                    <span>Render Backend Service Connection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowServerConfig(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  If your frontend is on Vercel and your backend is on Render, specify your Render URL here:
                </p>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={backendUrlInput}
                    onChange={e => setBackendUrlInput(e.target.value)}
                    placeholder="https://finpulse-backend.onrender.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={testAndSaveBackend}
                      disabled={isTestingBackend}
                      className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isTestingBackend ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing Health...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Test Health</span>
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
                      className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {backendStatus && (
                  <div className={`p-2 rounded text-[11px] ${backendStatus.online ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-red-950/80 text-red-300 border border-red-800'}`}>
                    {backendStatus.msg}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Tabs (Sign In / Register) */}
            {(tab === 'login' || tab === 'register') && (
              <div className="grid grid-cols-2 p-1.5 m-5 mb-0 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(null); setSuccess(null); }}
                  className={`py-2 rounded-lg transition-all ${
                    tab === 'login'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(null); setSuccess(null); }}
                  className={`py-2 rounded-lg transition-all ${
                    tab === 'register'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                  {(error.includes('HTML') || error.includes('Render') || error.includes('Vercel') || error.includes('Cannot connect')) && (
                    <div className="pt-2 border-t border-red-800/40">
                      <button
                        type="button"
                        onClick={() => setShowServerConfig(true)}
                        className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Server className="w-3.5 h-3.5" />
                        Configure Render Backend URL in Browser
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Success Banner */}
              {success && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{success}</span>
                </div>
              )}

              {/* ---------------- 1. LOGIN FORM ---------------- */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="rajesh@finpulse.local"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setTab('forgot'); setError(null); setSuccess(null); }}
                        className="text-[11px] font-medium text-blue-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Financial Vault</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <button
                      type="button"
                      onClick={fillDemoCredentials}
                      className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Fill Demo Credentials
                    </button>
                    <span>MongoDB Atlas Protected</span>
                  </div>
                </form>
              )}

              {/* ---------------- 2. REGISTER FORM ---------------- */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Rajesh Sharma"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="rajesh@example.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border text-white placeholder-slate-500 text-xs focus:outline-hidden transition-colors ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-red-500'
                            : 'border-slate-800 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <span className="text-[11px] text-red-400 mt-1 block">Passwords do not match</span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal pt-1">
                    An automated 6-digit verification code will be sent to your email. Dashboard access is gated until verification is complete.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Register &amp; Dispatch Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ---------------- 3. VERIFY EMAIL FORM ---------------- */}
              {tab === 'verify' && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-2">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Enter 6-Digit Verification Code</h3>
                    <p className="text-xs text-slate-400">
                      Code dispatched to <strong className="text-white">{maskEmail(email)}</strong> via Brevo SMTP
                    </p>
                  </div>

                  {/* Code Input */}
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-xl bg-slate-950 border border-slate-800 text-white font-black focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Timer & Expiry */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Expires in: </span>
                      <span className="font-mono font-bold text-white">{formatTimer(otpExpirySeconds)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldownSeconds > 0 || loading}
                      className="text-blue-400 hover:underline disabled:text-slate-600 disabled:no-underline font-medium"
                    >
                      {resendCooldownSeconds > 0
                        ? `Resend in ${resendCooldownSeconds}s`
                        : 'Resend Code'}
                    </button>
                  </div>

                  {/* Submit verification */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Token...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verify &amp; Activate Vault Access</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setTab('login'); setError(null); }}
                      className="text-xs text-slate-400 hover:text-white hover:underline"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------- 4. FORGOT PASSWORD FORM ---------------- */}
              {tab === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Password Recovery</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter the email address associated with your account. We will send an automated 6-digit recovery code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="rajesh@example.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Dispatching Recovery Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Dispatch Recovery Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setTab('login'); setError(null); }}
                      className="text-xs text-slate-400 hover:text-white hover:underline"
                    >
                      Cancel &amp; Return to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------- 5. RESET PASSWORD FORM ---------------- */}
              {tab === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Set New Password</h3>
                    <p className="text-xs text-slate-400">
                      Enter the 6-digit code received for <strong className="text-white">{email}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      6-Digit Recovery Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full py-2.5 text-center text-xl font-mono tracking-widest rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save New Password &amp; Sign In</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Card Footer: Active API endpoint indicator */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2 truncate max-w-[240px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate font-mono">Backend: {getApiBase()}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className="text-blue-400 hover:underline shrink-0"
              >
                {showServerConfig ? 'Hide Config' : 'Change Endpoint'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>FinPulse Multi-Tenant Financial Ledger · Secured with Brevo SMTP (Port 2525) &amp; MongoDB Atlas Storage</p>
      </footer>
    </div>
  );
};
