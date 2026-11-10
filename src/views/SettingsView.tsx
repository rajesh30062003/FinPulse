import React, { useState, useEffect } from 'react';
import { Settings, User, Mail, Database, Save, RotateCcw, ShieldCheck, CheckCircle2, Download, Server, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { api, getApiBase, setCustomApiUrl } from '../services/api';

export const SettingsView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { refreshAll, setIsScenarioModalOpen, setIsMailboxOpen } = useFinancial();

  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [monthlyBudgetRupees, setMonthlyBudgetRupees] = useState(
    user ? (user.monthlyBudgetInPaise / 100).toString() : '40000'
  );
  const [reminderDay, setReminderDay] = useState(user?.reminderDayOfMonth?.toString() || '25');
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotificationsEnabled ?? true);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

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
    }

    api.getSystemStatus().then(res => setDbStatus(res.database)).catch(() => null);
  }, [user]);

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
        smtpConfig: smtpHost ? { host: smtpHost, port: parseInt(smtpPort, 10), user: smtpUser, pass: smtpPass, from: smtpFrom } : undefined
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

        {/* Custom SMTP Configuration */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              Nodemailer SMTP Configuration (Optional)
            </h3>
            <button
              type="button"
              onClick={() => setIsMailboxOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open Email Sandbox Mailbox
            </button>
          </div>

          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            By default, all emails are automatically simulated and viewable in the built-in <strong>Email Sandbox Mailbox</strong>. To send to external inboxes, provide custom SMTP credentials or configure them in `.env`.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">SMTP Port</label>
              <input
                type="number"
                placeholder="587"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">From Address</label>
              <input
                type="text"
                placeholder="alerts@finpulse.example"
                value={smtpFrom}
                onChange={e => setSmtpFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">SMTP Username</label>
              <input
                type="text"
                placeholder="notifications@example.com"
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">SMTP Password</label>
              <input
                type="password"
                placeholder="App password or token"
                value={smtpPass}
                onChange={e => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
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
    </div>
  );
};
