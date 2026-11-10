import React, { useState } from 'react';
import { TrendingUp, Plus, Landmark, Wallet, CheckCircle2, Calendar } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const IncomeView: React.FC = () => {
  const { transactions, accounts, refreshAll, setIsAddTxOpen, setAddTxDefaultType } = useFinancial();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [source, setSource] = useState('Salary');
  const [amountRupees, setAmountRupees] = useState('');
  const [bankId, setBankId] = useState(accounts[0]?.id || '');
  const [description, setDescription] = useState('Monthly Salary Credit');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const incomeTxs = transactions.filter(t => t.type === 'income');
  const totalIncomePaise = incomeTxs.reduce((sum, t) => sum + t.amountInPaise, 0);

  const handleRecordIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(amountRupees) || 0) * 100);
      await api.createTransaction({
        type: 'income',
        mainCategory: 'Essential',
        subCategory: source,
        amountInPaise: amtPaise,
        paymentMethod: 'Bank Account',
        destinationAccountId: bankId,
        description,
        notes,
        date: new Date(date).toISOString()
      });
      await refreshAll();
      setIsRecordOpen(false);
      setAmountRupees('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sourcesBreakdown: Record<string, number> = {};
  incomeTxs.forEach(t => {
    sourcesBreakdown[t.subCategory] = (sourcesBreakdown[t.subCategory] || 0) + t.amountInPaise;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Income & Revenue Inflow Streams
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Log all earnings (Salary, Freelance, Business, Dividends) into your designated bank accounts or cash wallet.
          </p>
        </div>

        <button
          onClick={() => setIsRecordOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Income</span>
        </button>
      </div>

      {/* Main Income Total Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs text-slate-500 font-medium">Total Lifetime Income Recorded</span>
          <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalIncomePaise)}
          </div>
          <span className="text-[11px] text-slate-400">From {incomeTxs.length} verified inflow credits</span>
        </div>

        {/* Source chips */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(sourcesBreakdown).map(([src, paise]) => (
            <div key={src} className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500">{src}: </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(paise)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Income Records List */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Income Inflow Transactions</h3>

        {incomeTxs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No income entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Receiving Account</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {incomeTxs.map(t => {
                  const dest = accounts.find(a => a.id === t.destinationAccountId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-400">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {t.subCategory}
                      </td>
                      <td className="py-2.5 text-slate-800 dark:text-slate-200">
                        {t.description}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {dest ? `${dest.bankName} (${dest.accountNickname})` : t.paymentMethod}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(t.amountInPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Income Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Income Inflow</h2>
            <form onSubmit={handleRecordIncome} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Income Source</label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Salary">Salary</option>
                  <option value="Freelancing">Freelancing</option>
                  <option value="Business income">Business income</option>
                  <option value="Interest">Interest</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Gift received">Gift received</option>
                  <option value="Other income">Other income</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40000"
                    value={amountRupees}
                    onChange={e => setAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Receiving Bank Account</label>
                <select
                  value={bankId}
                  onChange={e => setBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} - {a.accountNickname}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Confirm Income
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
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
