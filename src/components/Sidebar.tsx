import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  Receipt,
  PieChart,
  Landmark,
  Wallet,
  CreditCard,
  FileCheck2,
  TrendingDown,
  ShieldAlert,
  PiggyBank,
  BarChart3,
  History,
  Bell,
  Settings,
  Mail,
  FlaskConical,
  X
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  isAction?: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    setIsAddTxOpen,
    setIsMailboxOpen,
    setIsScenarioModalOpen,
    mailboxLogs,
    unreadNotificationsCount
  } = useFinancial();

  const navSections: NavSection[] = [
    {
      title: 'CORE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'add-tx', label: 'Add Transaction', icon: PlusCircle, isAction: true },
      ]
    },
    {
      title: 'CASHFLOW',
      items: [
        { id: 'income', label: 'Income Management', icon: TrendingUp },
        { id: 'expenses', label: 'Expense Tracking', icon: Receipt },
        { id: 'budget', label: 'Budget Allocation', icon: PieChart },
      ]
    },
    {
      title: 'ACCOUNTS & DEBT',
      items: [
        { id: 'banks', label: 'Bank Accounts', icon: Landmark },
        { id: 'cash', label: 'Cash Management', icon: Wallet },
        { id: 'credit-cards', label: 'Credit Cards', icon: CreditCard },
        { id: 'credit-card-bills', label: 'Credit Card Bills', icon: FileCheck2 },
      ]
    },
    {
      title: 'GROWTH & RESERVES',
      items: [
        { id: 'investments', label: 'Investments', icon: TrendingDown },
        { id: 'fixed-deposits', label: 'Fixed Deposits', icon: Landmark },
        { id: 'emergency-fund', label: 'Emergency Fund', icon: ShieldAlert },
        { id: 'savings-goals', label: 'Savings Goals', icon: PiggyBank },
      ]
    },
    {
      title: 'SYSTEM & LOGS',
      items: [
        { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
        { id: 'transactions', label: 'Transaction History', icon: History },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              FP
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white tracking-tight">FinPulse</span>
              <span className="text-[10px] text-blue-400 block -mt-1 font-mono">FINANCIAL LEDGER</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.isAction) {
                          setIsAddTxOpen(true);
                        } else {
                          setActiveTab(item.id);
                        }
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        item.isAction
                          ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
                          : isActive
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Utility Tools (Mailbox Sandbox & Scenario Verifier) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <button
            onClick={() => {
              setIsMailboxOpen(true);
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Email Sandbox Mailbox</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {mailboxLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setIsScenarioModalOpen(true);
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <span>9 Scenarios Auditor</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">Verify</span>
          </button>
        </div>
      </aside>
    </>
  );
};
