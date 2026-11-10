import React, { useState, useEffect } from 'react';
import { Menu, Plus, Bell, Mail, ShieldAlert, Sun, Moon, User, CheckCircle2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const {
    activeTab,
    setIsAddTxOpen,
    setIsMailboxOpen,
    unreadNotificationsCount,
    setIsAuthModalOpen,
    setActiveTab,
    mailboxLogs
  } = useFinancial();

  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const getTabLabel = (id: string) => {
    const labels: Record<string, string> = {
      dashboard: 'Financial Dashboard',
      income: 'Income & Inflow Sources',
      expenses: 'Expense Management',
      budget: 'Monthly Budget Allocation',
      banks: 'Bank Account Management',
      cash: 'Cash Wallet Management',
      'credit-cards': 'Credit Card Portfolio',
      'credit-card-bills': 'Credit Card Bill Payments',
      investments: 'Investment Portfolio',
      'fixed-deposits': 'Fixed Deposits Tracker',
      'emergency-fund': 'Emergency Fund Reserve',
      'savings-goals': 'Target Savings Goals',
      analytics: 'Analytics & Financial Reports',
      transactions: 'Transaction Ledger History',
      notifications: 'System & Scheduled Reminders',
      settings: 'System & Preference Settings'
    };
    return labels[id] || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 gap-4 transition-colors">
      {/* Zone 1 & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-slate-900 dark:text-white tracking-tight hidden sm:inline">
            FinPulse
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {getTabLabel(activeTab)}
          </span>
        </div>
      </div>

      {/* Middle status or email unverified notice */}
      {user && !user.isVerified && (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Email Unverified · Click to complete recovery setup</span>
        </button>
      )}

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Email Sandbox Mailbox shortcut */}
        <button
          onClick={() => setIsMailboxOpen(true)}
          title="Open Automated Email Sandbox"
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {mailboxLogs.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setActiveTab('notifications')}
          title="Notifications"
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title="Toggle Dark Mode"
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Account / Auth Modal Trigger */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px]">
            {user?.name ? user.name[0].toUpperCase() : 'R'}
          </div>
          <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || 'Account'}</span>
          {user?.isVerified && (
            <span title="Email Verified">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            </span>
          )}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={() => setIsAddTxOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
};
