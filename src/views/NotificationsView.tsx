import React, { useState } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Check, RefreshCw, Calendar } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../services/api';

export const NotificationsView: React.FC = () => {
  const { notifications, unreadNotificationsCount, refreshAll } = useFinancial();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    await refreshAll();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    await refreshAll();
  };

  const handleTriggerReminderCheck = async () => {
    try {
      setLoading(true);
      setMsg(null);
      await api.triggerReminderCheck();
      await refreshAll();
      setMsg('Executed automated reminder check. Newly evaluated alerts generated if thresholds met.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Financial Alerts & Scheduled Reminders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated alerts for upcoming 25th credit card due dates, Fixed Deposit maturities, and account balance warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerReminderCheck}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check & Run Reminders Now</span>
          </button>
          {unreadNotificationsCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">All financial commitments clear. No active alerts.</p>
          </div>
        ) : (
          notifications.map(notif => {
            const isBill = notif.type === 'bill_reminder';
            const isFD = notif.type === 'fd_maturity';
            const isLowBal = notif.type === 'low_balance';

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                  notif.isRead
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isBill
                      ? 'bg-red-500/10 text-red-600'
                      : isFD
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {isBill ? <Clock className="w-4 h-4" /> : isFD ? <Calendar className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
