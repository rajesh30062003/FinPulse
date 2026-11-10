import React, { useState } from 'react';
import { PiggyBank, Plus, ArrowUpRight, Trash2, Calendar, Target, CheckCircle2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';
import { ISavingsGoal } from '../types';

export const SavingsGoalsView: React.FC = () => {
  const { savingsGoals, accounts, refreshAll } = useFinancial();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ISavingsGoal | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [targetRupees, setTargetRupees] = useState('');
  const [savedRupees, setSavedRupees] = useState('0');
  const [targetDate, setTargetDate] = useState('2027-03-31');
  const [monthlyContributionRupees, setMonthlyContributionRupees] = useState('');
  const [notes, setNotes] = useState('');

  // Contribution state
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [contributeRupees, setContributeRupees] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createSavingsGoal({
        name,
        targetAmountInPaise: Math.round((parseFloat(targetRupees) || 0) * 100),
        savedAmountInPaise: Math.round((parseFloat(savedRupees) || 0) * 100),
        targetDate,
        monthlyContributionInPaise: Math.round((parseFloat(monthlyContributionRupees) || 0) * 100),
        notes
      });
      await refreshAll();
      setIsAddOpen(false);
      setName('');
      setTargetRupees('');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      setLoading(true);
      const amt = Math.round((parseFloat(contributeRupees) || 0) * 100);
      await api.contributeSavingsGoal(selectedGoal.id, {
        amountInPaise: amt,
        sourceAccountId
      });
      await refreshAll();
      setIsContributeOpen(false);
      setContributeRupees('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Delete this savings goal?')) {
      await api.deleteSavingsGoal(id);
      await refreshAll();
    }
  };

  const totalSavedPaise = savingsGoals.reduce((sum, g) => sum + g.savedAmountInPaise, 0);
  const totalTargetPaise = savingsGoals.reduce((sum, g) => sum + g.targetAmountInPaise, 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            Target Savings Goals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build discipline towards targeted future purchases (laptops, travel, gadgets) with designated monthly contributions.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Cumulative Savings Accumulated</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalSavedPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Across {savingsGoals.length} goals</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Financial Target</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalTargetPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of all goal targets</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Overall Progress</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {totalTargetPaise > 0 ? Math.round((totalSavedPaise / totalTargetPaise) * 100) : 0}%
          </div>
          <span className="text-[11px] text-slate-400">Average milestone completion</span>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {savingsGoals.map(goal => {
          const pct = goal.targetAmountInPaise > 0
            ? Math.min(100, Math.round((goal.savedAmountInPaise / goal.targetAmountInPaise) * 100))
            : 0;
          const remainingPaise = Math.max(0, goal.targetAmountInPaise - goal.savedAmountInPaise);

          return (
            <div
              key={goal.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{goal.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target Date: {new Date(goal.targetDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress metrics */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400">Saved So Far:</span>
                  <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatINR(goal.savedAmountInPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Target Goal:</span>
                  <div className="font-mono font-semibold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatINR(goal.targetAmountInPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Remaining:</span>
                  <div className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatINR(remainingPaise)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Progress:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Monthly Target: {formatINR(goal.monthlyContributionInPaise)}/mo
                </span>
                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setIsContributeOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Contribute</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create Savings Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro, Japan Trip, Home Downpayment"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="120000"
                    value={targetRupees}
                    onChange={e => setTargetRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Initial Saved (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={savedRupees}
                    onChange={e => setSavedRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Monthly Planned (₹)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={monthlyContributionRupees}
                    onChange={e => setMonthlyContributionRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. For photography and coding gigs"
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
                  Create Goal
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

      {/* Contribute Modal */}
      {isContributeOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Contribute to: {selectedGoal.name}
            </h2>
            <form onSubmit={handleContribute} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Pay From Bank Account</label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({formatINR(a.balanceInPaise)})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Contribution Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={contributeRupees}
                  onChange={e => setContributeRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Transfer into Goal
                </button>
                <button
                  type="button"
                  onClick={() => setIsContributeOpen(false)}
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
