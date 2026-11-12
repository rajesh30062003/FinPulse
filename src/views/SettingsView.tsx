import React, { useState, useEffect } from 'react';
import { Settings, User, Mail, Database, Save, RotateCcw, ShieldCheck, CheckCircle2, Download, Server, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { api, getApiBase, setCustomApiUrl } from '../services/api';

export const SettingsView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { accounts, creditCards, refreshAll, setIsScenarioModalOpen } = useFinancial();

  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [monthlyBudgetRupees, setMonthlyBudgetRupees] = useState(
    user ? (user.monthlyBudgetInPaise / 100).toString() : '40000'
  );
  const [reminderDay, setReminderDay] = useState(user?.reminderDayOfMonth?.toString() || '25');
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotificationsEnabled ?? true);

  // Fresh Start / Reset Bank & Card Setup
  const [resetInput, setResetInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');
  const activeCards = creditCards.filter(c => c.isActive !== false && c.status !== 'Closed');

  // Brevo SMTP Settings (Defaulted to Brevo SMTP on Port 2525)
  const [smtpHost, setSmtpHost] = useState('smtp-relay.brevo.com');
  const [smtpPort, setSmtpPort] = useState('2525');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpDiagnostics, setSmtpDiagnostics] = useState<any>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; msg: string; details?: any } | null>(null);

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Backend connection & Render config
  const [backendUrl, setBackendUrl] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('finpulse_api_url') || (import.meta.env.VITE_API_URL as string) || '' : ''
  );
  const [backendMsg, setBackendMsg] = useState<string | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  const handleUpdateBackendUrl = async () => {
    setIsTestingBackend(true);
    setBackendMsg(null);
    try {
      if (!backendUrl.trim()) {
        setCustomApiUrl(null);
        setBackendMsg('Reset to default relative API (/api)');
        const status = await api.getHealth();
        setDbStatus(status.database);
        return;
      }
      setCustomApiUrl(backendUrl.trim());
      const status = await api.getHealth();
      setDbStatus(status.database);
      setBackendMsg(`Successfully connected to ${status.service || 'backend'}!`);
    } catch (err: any) {
      setBackendMsg('Connection test failed: ' + (err.message || 'Cannot reach URL'));
    } finally {
      setIsTestingBackend(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCurrency(user.currency || 'INR');
      setMonthlyBudgetRupees((user.monthlyBudgetInPaise / 100).toString());
      setReminderDay(user.reminderDayOfMonth?.toString() || '25');
      setEmailNotifications(user.emailNotificationsEnabled ?? true);
      setTestEmailRecipient(user.email || '');
    }

    api.getSystemStatus().then(res => setDbStatus(res.database)).catch(() => null);
    api.getSmtpStatus().then(res => setSmtpDiagnostics(res)).catch(() => null);
  }, [user]);

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtpConnection(testEmailRecipient.trim() || user?.email);
      setSmtpTestResult({
        success: res.success,
        msg: res.message || (res.success ? 'Brevo relay accepted email for delivery.' : 'Brevo relay failed to dispatch'),
        details: res
      });
      const updated = await api.getSmtpStatus();
      setSmtpDiagnostics(updated);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        msg: err.message || 'SMTP diagnostic request failed'
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);
      await api.updateProfile({
        name,
        currency,
        monthlyBudgetInPaise: Math.round((parseFloat(monthlyBudgetRupees) || 40000) * 100),
        reminderDayOfMonth: parseInt(reminderDay, 10),
        emailNotificationsEnabled: emailNotifications,
        smtpConfig: smtpUser.trim() && smtpPass.trim() ? { host: smtpHost.trim(), port: parseInt(smtpPort, 10), user: smtpUser.trim(), pass: smtpPass.trim(), from: smtpFrom.trim() } : undefined
      });
      await refreshUser();
      await refreshAll();
      setMsg('Settings saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('Reset entire ledger and accounts to realistic pre-seeded data for all 9 scenarios?')) {
      await api.resetScenarios();
      await refreshAll();
      setMsg('Ledger reset to demo test suite.');
    }
  };

  const handleResetBankAndCardSetup = async () => {
    if (resetInput.trim() !== 'RESET') {
      alert('Please type "RESET" in capital letters to confirm.');
      return;
    }
    try {
      setIsResetting(true);
      setResetFeedback(null);
      const res = await api.resetBankAndCardSetup('RESET');
      await refreshAll();
      setShowResetModal(false);
      setResetInput('');
      setMsg(res.message || 'Active bank accounts and credit cards have been deactivated.');
      setResetFeedback(`Closed ${res.closedAccountsCount} bank account(s) and ${res.closedCardsCount} credit card(s). Historical records preserved.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reset bank and card setup');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          System & Financial Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure financial reporting parameters, automated email dispatch settings, and database integration.
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Database Integration Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">MongoDB Atlas Architecture & Status</h3>
          </div>
          <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-medium ${
            dbStatus?.connected
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
          }`}>
            {dbStatus?.connected ? 'Atlas Cluster Connected' : 'Resilient Ledger Engine Active'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The application is fully configured for production deployment on Render with MongoDB Atlas Mongoose models. In local/preview mode, it operates seamlessly with the built-in resilient double-entry JSON ledger so all transactions persist across turns.
        </p>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
          <div className="text-slate-500">Connection State: <span className="text-slate-800 dark:text-slate-200 font-semibold">{dbStatus?.activeUri}</span></div>
          {dbStatus?.error && <div className="text-amber-500">Notice: {dbStatus.error}</div>}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile & Financial Parameters */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Profile & Financial Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">User Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Default Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Spending Budget Ceiling (₹)</label>
              <input
                type="number"
                value={monthlyBudgetRupees}
                onChange={e => setMonthlyBudgetRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Credit Card Monthly Reminder Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={reminderDay}
                onChange={e => setReminderDay(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400">Scheduled monthly alert triggers on this day (Default: 25th)</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Enable Automated Email Notifications (Bill Reminders, FD Alerts)</span>
            </label>
          </div>
        </div>

        {/* Brevo SMTP Free (Port 2525) Configuration & Live Diagnostics */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              Brevo SMTP Relay (Port 2525) &amp; Live Delivery
            </h3>
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-medium ${
              smtpDiagnostics?.verified
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : smtpDiagnostics?.configured
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {smtpDiagnostics?.verified ? 'Brevo SMTP Active (2525)' : smtpDiagnostics?.configured ? 'Configured - Verify Auth' : 'Pending Credentials'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Render Free Port 2525 Unblocking</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300/90">
              Render Free firewalls block outbound connections to ports 25, 465, and 587. FinPulse connects to Brevo SMTP using port <strong>2525</strong> with <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono text-[10px]">requireTLS: true</code>. Simulated email sandbox functionality has been removed in favor of real Brevo message delivery.
            </p>
          </div>

          {/* Active Status Display */}
          {smtpDiagnostics && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">Relay Host: </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">{smtpDiagnostics.host}:{smtpDiagnostics.port}</span>
                </div>
                <div>
                  <span className="text-slate-400">Authenticated Login: </span>
                  <span className="text-slate-900 dark:text-slate-100">{smtpDiagnostics.userMasked || 'None configured'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Sender Address: </span>
                  <span className="text-slate-900 dark:text-slate-100">{smtpDiagnostics.from || 'FinPulse <noreply@finpulse.local>'}</span>
                </div>
              </div>
              <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-200 dark:border-slate-700">
                Diagnostic: {smtpDiagnostics.message}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Brevo SMTP Host</label>
              <input
                type="text"
                placeholder="smtp-relay.brevo.com"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Brevo SMTP Port (Render Free: 2525)</label>
              <input
                type="number"
                placeholder="2525"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Verified Sender Email</label>
              <input
                type="text"
                placeholder="alerts@yourdomain.com"
                value={smtpFrom}
                onChange={e => setSmtpFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Brevo SMTP Login (Account Email)</label>
              <input
                type="text"
                placeholder="your-brevo-login@example.com"
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Brevo SMTP Key (xsmtpsib-...)</label>
              <input
                type="password"
                placeholder="xsmtpsib-xxxxxxxxxxxxxxxxxxxx"
                value={smtpPass}
                onChange={e => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Test Dispatcher */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              <span>Dispatch Live Test Email via Brevo Relay</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="recipient@example.com"
                value={testEmailRecipient}
                onChange={e => setTestEmailRecipient(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isTestingSmtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Relay...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispatch Test Email</span>
                  </>
                )}
              </button>
            </div>

            {smtpTestResult && (
              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                smtpTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {smtpTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldCheck className="w-4 h-4 text-red-600" />}
                  <span>{smtpTestResult.msg}</span>
                </div>
                {smtpTestResult.details?.messageId && (
                  <div className="font-mono text-[10px] mt-1 text-emerald-600 dark:text-emerald-400">
                    Message ID: {smtpTestResult.details.messageId}
                  </div>
                )}
                {smtpTestResult.details?.code && (
                  <div className="font-mono text-[10px] mt-1">
                    Error Code: {smtpTestResult.details.code}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save All Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Backend & Cloud Deployment Config */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Backend API & Database Connection</h3>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            Active: {getApiBase()}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          When deployed on Vercel, connect directly to your live Render backend URL so registration, authentication, and MongoDB Atlas persistence operate seamlessly.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Render Backend Service URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={backendUrl}
              onChange={e => setBackendUrl(e.target.value)}
              placeholder="https://finpulse-backend.onrender.com"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
            <button
              type="button"
              onClick={handleUpdateBackendUrl}
              disabled={isTestingBackend}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isTestingBackend ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Test Health</span>
                </>
              )}
            </button>
          </div>
          {backendMsg && (
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs">
              {backendMsg}
            </div>
          )}
        </div>

        {dbStatus && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>Atlas Status: <strong>{dbStatus.connected ? 'Connected' : 'Resilient Local Store Active'}</strong></span>
            </div>
            <div>
              <span>Mode: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{dbStatus.activeUri || 'Resilient Ledger'}</code></span>
            </div>
          </div>
        )}
      </div>

      {/* Fresh Start: Reset Bank & Card Setup */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fresh Start: Reset Bank &amp; Credit Card Setup</h3>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-mono font-medium">
            Account Management
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Need to reconfigure your real-world bank accounts and credit cards from scratch? This action safely deactivates (soft-closes) your current active accounts and cards so you can register your actual personal accounts.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Guaranteed Data Safety Guarantees</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <li><strong>Preserves 100% of History:</strong> All transactions, credit card bill payments, cash balances, monthly budgets, investments, fixed deposits, and emergency fund balances remain intact.</li>
            <li><strong>Zero Synthetic Data:</strong> FinPulse will NOT automatically re-create demo accounts or dummy cards after this reset.</li>
            <li><strong>Isolated to Your Account:</strong> Operates strictly on your authenticated user profile ({user?.email || 'current user'}). Other users are never affected.</li>
          </ul>
          <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700">
            <span>Currently Active: <strong>{activeAccounts.length}</strong> bank account(s)</span>
            <span>•</span>
            <span>Currently Active: <strong>{activeCards.length}</strong> credit card(s)</span>
          </div>
        </div>

        {resetFeedback && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{resetFeedback}</span>
          </div>
        )}

        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => {
              setResetInput('');
              setShowResetModal(true);
            }}
            disabled={activeAccounts.length === 0 && activeCards.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Bank &amp; Card Setup (Fresh Start)</span>
          </button>
        </div>
      </div>

      {/* Maintenance & Reset Tools */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Demo Data & Audit Verification</h3>
        <p className="text-xs text-slate-500">
          Restore realistic initial data covering all 9 test scenarios or audit ledger integrity.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Ledger Suite</span>
          </button>
          <button
            type="button"
            onClick={() => setIsScenarioModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Open 9 Scenarios Auditor</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.href = `${getApiBase()}/transactions/export/csv`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Download Full CSV Export</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Confirm Financial Setup Reset</h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This action will deactivate (soft-close) <strong>{activeAccounts.length} active bank account(s)</strong> and <strong>{activeCards.length} active credit card(s)</strong>.
            </p>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <div className="font-semibold">Notice:</div>
              <p className="text-[11px] leading-relaxed">
                Active balances will be removed from your liquid dashboard summary. Historical transactions, credit card payment history, cash balance, budgets, investments, and FDs are completely preserved.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                To confirm, type <span className="font-mono text-red-600 font-bold">RESET</span> below:
              </label>
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white uppercase tracking-wider"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBankAndCardSetup}
                disabled={resetInput.trim() !== 'RESET' || isResetting}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
