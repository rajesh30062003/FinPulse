import React, { useState } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const CashManagementView: React.FC = () => {
  const { cash, accounts, refreshAll, transactions } = useFinancial();

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const [bankId, setBankId] = useState(activeAccounts[0]?.id || '');
  const [amountRupees, setAmountRupees] = useState('');
  const [adjustAmountRupees, setAdjustAmountRupees] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleWithdrawFromBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(amountRupees) || 0) * 100);
      await api.createTransaction({
        type: 'cash_withdrawal',
        mainCategory: 'Transfer',
        subCategory: 'Cash Withdrawal from Bank',
        amountInPaise: amtPaise,
        paymentMethod: 'Bank Account',
        sourceAccountId: bankId,
        description: 'ATM / Branch cash withdrawal',
        date: new Date().toISOString()
      });
      await refreshAll();
      setIsWithdrawOpen(false);
      setMsg(`Withdrew ${formatINR(amtPaise)} from bank to cash wallet. Total wealth unchanged.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositToBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(amountRupees) || 0) * 100);
      await api.createTransaction({
        type: 'cash_deposit',
        mainCategory: 'Transfer',
        subCategory: 'Cash Deposit into Bank',
        amountInPaise: amtPaise,
        paymentMethod: 'Cash',
        destinationAccountId: bankId,
        description: 'Branch cash deposit into account',
        date: new Date().toISOString()
      });
      await refreshAll();
      setIsDepositOpen(false);
      setMsg(`Deposited ${formatINR(amtPaise)} cash into bank account.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(adjustAmountRupees) || 0) * 100);
      await api.adjustCash({
        newBalanceInPaise: amtPaise,
        reason: adjustReason || 'Physical cash audit recount'
      });
      await refreshAll();
      setIsAdjustOpen(false);
      setMsg(`Cash wallet updated to ${formatINR(amtPaise)}.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cashBalancePaise = cash?.balanceInPaise || 0;
  const cashTxs = transactions.filter(t => t.paymentMethod === 'Cash' || t.type === 'cash_withdrawal' || t.type === 'cash_deposit');

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Cash Management & Physical Wallet
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cash withdrawals and deposits are asset transfers, not expenses or incomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Withdraw from ATM / Bank</span>
          </button>
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
            <span>Deposit Cash to Bank</span>
          </button>
          <button
            onClick={() => {
              setAdjustAmountRupees((cashBalancePaise / 100).toString());
              setIsAdjustOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Audit Adjustment</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Main Cash Balance Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs text-slate-500 font-medium">Physical Cash on Hand</span>
          <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(cashBalancePaise)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {cash?.notes || 'Physical wallet buffer for cash-only merchant payments'}
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-slate-400">Total Cash Inflows:</span>
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              +{formatINR(cashTxs.filter(t => t.type === 'cash_withdrawal' || (t.type === 'income' && t.paymentMethod === 'Cash')).reduce((sum, t) => sum + t.amountInPaise, 0))}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Total Cash Spent:</span>
            <div className="font-mono font-bold text-sm text-red-500 mt-0.5">
              -{formatINR(cashTxs.filter(t => t.type === 'expense' && t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.amountInPaise, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Cash Transaction Log */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cash Activity Ledger</h3>

        {cashTxs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No cash transactions logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {cashTxs.map(t => {
                  const isPlus = t.type === 'cash_withdrawal' || (t.type === 'income' && t.paymentMethod === 'Cash');
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-400">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium capitalize">
                        {t.type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 text-slate-800 dark:text-slate-200">
                        {t.description}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {t.mainCategory} · {t.subCategory}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-semibold ${
                        isPlus ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {isPlus ? '+' : '-'}{formatINR(t.amountInPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Withdraw Cash from Bank Account</h2>
            <form onSubmit={handleWithdrawFromBank} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Source Bank</label>
                <select
                  value={bankId}
                  onChange={e => setBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} (Available: {formatINR(a.balanceInPaise)})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={amountRupees}
                  onChange={e => setAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Confirm Cash Withdrawal
                </button>
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Deposit Cash into Bank Account</h2>
            <form onSubmit={handleDepositToBank} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Destination Bank</label>
                <select
                  value={bankId}
                  onChange={e => setBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Cash Deposit Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2000"
                  value={amountRupees}
                  onChange={e => setAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Confirm Cash Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Adjust Modal */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cash Wallet Balance Audit</h2>
            <form onSubmit={handleAdjustBalance} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Actual Recounted Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustAmountRupees}
                  onChange={e => setAdjustAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason / Audit Log Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end physical cash reconciliation"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Save Cash Balance
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
