import React, { useState } from 'react';
import { ShieldAlert, Plus, ArrowDownRight, ArrowUpRight, Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const EmergencyFundView: React.FC = () => {
  const { emergencyFund, accounts, refreshAll, transactions } = useFinancial();

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isEditTargetOpen, setIsEditTargetOpen] = useState(false);

  const [targetRupees, setTargetRupees] = useState('');
  const [depositBankId, setDepositBankId] = useState(activeAccounts[0]?.id || '');
  const [depositAmountRupees, setDepositAmountRupees] = useState('');
  const [withdrawBankId, setWithdrawBankId] = useState(activeAccounts[0]?.id || '');
  const [withdrawAmountRupees, setWithdrawAmountRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentBalance = emergencyFund?.currentBalanceInPaise || 0;
  const targetBalance = emergencyFund?.targetAmountInPaise || 10000000;
  const remaining = Math.max(0, targetBalance - currentBalance);
  const progressPercent = targetBalance > 0 ? Math.min(100, Math.round((currentBalance / targetBalance) * 100)) : 0;

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateEmergencyTarget(Math.round((parseFloat(targetRupees) || 0) * 100));
      await refreshAll();
      setIsEditTargetOpen(false);
      setMsg('Emergency fund target updated.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amt = Math.round((parseFloat(depositAmountRupees) || 0) * 100);
      await api.depositEmergencyFund({
        amountInPaise: amt,
        sourceAccountId: depositBankId,
        notes: notes || 'Reserve cushion deposit'
      });
      await refreshAll();
      setIsDepositOpen(false);
      setDepositAmountRupees('');
      setMsg(`Added ${formatINR(amt)} to emergency fund without counting as an ordinary expense.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amt = Math.round((parseFloat(withdrawAmountRupees) || 0) * 100);
      await api.withdrawEmergencyFund({
        amountInPaise: amt,
        destinationAccountId: withdrawBankId,
        notes: notes || 'Emergency cushion liquidation'
      });
      await refreshAll();
      setIsWithdrawOpen(false);
      setWithdrawAmountRupees('');
      setMsg(`Withdrew ${formatINR(amt)} from emergency fund into your bank account.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Find emergency fund transactions
  const efTxs = transactions.filter(t => t.type === 'emergency_deposit' || t.type === 'emergency_withdrawal');

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Emergency Fund Reserve
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Isolated capital cushion. Deposits and withdrawals are internal transfers that NEVER get counted as ordinary expenses or income.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Add Money to Fund</span>
          </button>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw Money</span>
          </button>
          <button
            onClick={() => {
              setTargetRupees((targetBalance / 100).toString());
              setIsEditTargetOpen(true);
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Edit Target"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Main Progress Showcase Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-slate-500 font-medium">Current Emergency Savings</span>
            <div className="text-3xl font-extrabold font-mono text-amber-500 mt-1">
              {formatINR(currentBalance)}
            </div>
            <span className="text-[11px] text-slate-400">Total liquid cushion secured</span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-medium">Target Emergency Reserve</span>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
              {formatINR(targetBalance)}
            </div>
            <span className="text-[11px] text-slate-400">Goal: 6 months of living expenses</span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-medium">Remaining to Reach Target</span>
            <div className="text-3xl font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {formatINR(remaining)}
            </div>
            <span className="text-[11px] text-slate-400">{progressPercent}% accomplished</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Fund Readiness Level</span>
            <span className="font-mono text-amber-500">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Fund Activity History</h3>

        {efTxs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No deposits or withdrawals recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-center">Ledger Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {efTxs.map(t => {
                  const isDeposit = t.type === 'emergency_deposit';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-400">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className={`py-2.5 font-semibold ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isDeposit ? 'Cushion Deposit' : 'Emergency Withdrawal'}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {t.description}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-bold ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {isDeposit ? '+' : '-'}{formatINR(t.amountInPaise)}
                      </td>
                      <td className="py-2.5 text-center text-[10px] font-mono text-slate-500">
                        Internal Asset Transfer (Zero Expense)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Target Modal */}
      {isEditTargetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Update Emergency Fund Target</h2>
            <form onSubmit={handleUpdateTarget} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Cushion Goal (₹)</label>
                <input
                  type="number"
                  required
                  value={targetRupees}
                  onChange={e => setTargetRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Save Target
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditTargetOpen(false)}
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Deposit to Emergency Fund</h2>
            <form onSubmit={handleDeposit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">From Bank Account</label>
                <select
                  value={depositBankId}
                  onChange={e => setDepositBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({formatINR(a.balanceInPaise)})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Deposit Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 3000"
                  value={depositAmountRupees}
                  onChange={e => setDepositAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Monthly emergency cushion deposit"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Deposit Funds
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

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Withdraw from Emergency Fund</h2>
            <form onSubmit={handleWithdraw} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Receiving Bank Account</label>
                <select
                  value={withdrawBankId}
                  onChange={e => setWithdrawBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={withdrawAmountRupees}
                  onChange={e => setWithdrawAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-semibold"
                >
                  Confirm Withdrawal
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
    </div>
  );
};
