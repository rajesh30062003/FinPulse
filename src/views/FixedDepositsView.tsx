import React, { useState } from 'react';
import { Landmark, Plus, Calendar, Bell, ShieldCheck, Trash2, CheckCircle2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const FixedDepositsView: React.FC = () => {
  const { fixedDeposits, accounts, refreshAll } = useFinancial();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [bankName, setBankName] = useState('HDFC Bank');
  const [fdName, setFdName] = useState('');
  const [principalRupees, setPrincipalRupees] = useState('');
  const [interestRate, setInterestRate] = useState('7.5');
  const [compoundingFrequency, setCompoundingFrequency] = useState<'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Annually'>('Quarterly');
  const [durationMonths, setDurationMonths] = useState('12');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live calculator preview
  const previewPrincipal = parseFloat(principalRupees) || 0;
  const previewRate = (parseFloat(interestRate) || 0) / 100;
  const previewN = compoundingFrequency === 'Monthly' ? 12 : compoundingFrequency === 'Quarterly' ? 4 : compoundingFrequency === 'Half-Yearly' ? 2 : 1;
  const previewT = (parseInt(durationMonths, 10) || 12) / 12;
  const previewMaturity = previewPrincipal > 0
    ? Math.round(previewPrincipal * Math.pow(1 + previewRate / previewN, previewN * previewT))
    : 0;
  const previewInterest = previewMaturity - previewPrincipal;

  const handleCreateFD = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createFixedDeposit({
        bankName,
        fdName: fdName || `${bankName} Fixed Deposit`,
        principalInPaise: Math.round(previewPrincipal * 100),
        interestRate: parseFloat(interestRate),
        compoundingFrequency,
        durationMonths: parseInt(durationMonths, 10),
        autoRenewal,
        sourceAccountId: sourceAccountId || undefined
      });
      await refreshAll();
      setIsAddOpen(false);
      setFdName('');
      setPrincipalRupees('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFD = async (id: string) => {
    if (confirm('Delete this Fixed Deposit record?')) {
      await api.deleteFixedDeposit(id);
      await refreshAll();
    }
  };

  const totalPrincipalPaise = fixedDeposits.reduce((sum, f) => sum + f.principalInPaise, 0);
  const totalMaturityPaise = fixedDeposits.reduce((sum, f) => sum + f.maturityAmountInPaise, 0);
  const totalInterestEarnedPaise = totalMaturityPaise - totalPrincipalPaise;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600" />
            Fixed Deposit (FD) Management & Maturity Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Exact compound interest projections with automated reminders 30 days before, 7 days before, and on the maturity date.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Fixed Deposit</span>
        </button>
      </div>

      {/* Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Cumulative FD Principal</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalPrincipalPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Total locked term deposits</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Guaranteed Interest</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatINR(totalInterestEarnedPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Accrued compounding yield</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Projected Maturity Payout</span>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(totalMaturityPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Total proceeds upon maturity</span>
        </div>
      </div>

      {/* FD Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {fixedDeposits.map(fd => {
          const matDate = new Date(fd.maturityDate);
          const daysLeft = Math.ceil((matDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isApproaching = daysLeft <= 30 && daysLeft >= 0;

          return (
            <div
              key={fd.id}
              className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-4 ${
                isApproaching
                  ? 'border-indigo-400 dark:border-indigo-600/80 ring-1 ring-indigo-400/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-slate-500">{fd.bankName}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{fd.fdName}</h3>
                </div>

                {isApproaching && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <Bell className="w-3 h-3" />
                    Matures in {daysLeft} Days
                  </span>
                )}
              </div>

              {/* Numbers grid */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400">Principal:</span>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {formatINR(fd.principalInPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Interest Earned:</span>
                  <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{formatINR(fd.interestEarnedInPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Maturity Payout:</span>
                  <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formatINR(fd.maturityAmountInPaise)}
                  </div>
                </div>
              </div>

              {/* Compounding & terms */}
              <div className="text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Interest Rate:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{fd.interestRate}% p.a. ({fd.compoundingFrequency} Compounding)</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration & Maturity:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{fd.durationMonths} Months · {matDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-Renewal:</span>
                  <span>{fd.autoRenewal ? 'Enabled' : 'Disabled (Transfer to Savings)'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleDeleteFD(fd.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Record</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add FD Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create Fixed Deposit Record</h2>
            <form onSubmit={handleCreateFD} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">FD Name</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-Year Cumulative FD"
                    value={fdName}
                    onChange={e => setFdName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Principal (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={principalRupees}
                    onChange={e => setPrincipalRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    value={durationMonths}
                    onChange={e => setDurationMonths(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Compounding Frequency</label>
                <select
                  value={compoundingFrequency}
                  onChange={e => setCompoundingFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly (Most Indian Banks)</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              {/* Calculated Preview Box */}
              {previewPrincipal > 0 && (
                <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Guaranteed Interest Earned:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatINR(previewInterest * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Final Maturity Value:</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">{formatINR(previewMaturity * 100)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Fund From Bank Account</label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">No bank deduction (already booked)</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({formatINR(a.balanceInPaise)})</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
                >
                  Book Fixed Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
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
