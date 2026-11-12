import React, { useState, useEffect } from 'react';
import { PieChart, Save, AlertTriangle, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const BudgetAllocationView: React.FC = () => {
  const { budgetData, summary, refreshAll } = useFinancial();

  const [essentialRupees, setEssentialRupees] = useState('');
  const [funRupees, setFunRupees] = useState('');
  const [investmentRupees, setInvestmentRupees] = useState('');
  const [emergencyRupees, setEmergencyRupees] = useState('');
  const [savingsRupees, setSavingsRupees] = useState('');
  const [carryForward, setCarryForward] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (budgetData?.allocation) {
      const a = budgetData.allocation;
      setEssentialRupees((a.essentialBudgetInPaise / 100).toString());
      setFunRupees((a.funBudgetInPaise / 100).toString());
      setInvestmentRupees((a.investmentBudgetInPaise / 100).toString());
      setEmergencyRupees((a.emergencyBudgetInPaise / 100).toString());
      setSavingsRupees((a.savingsBudgetInPaise / 100).toString());
      setCarryForward(Boolean(a.carryForwardEnabled));
    }
  }, [budgetData]);

  const totalAllocatedRupees =
    (parseFloat(essentialRupees) || 0) +
    (parseFloat(funRupees) || 0) +
    (parseFloat(investmentRupees) || 0) +
    (parseFloat(emergencyRupees) || 0) +
    (parseFloat(savingsRupees) || 0);

  // 1. Total Budget (Configured ceiling)
  const totalBudgetRupees = (budgetData?.totalBudgetPaise ?? summary?.monthlyBudgetPaise ?? 4000000) / 100;
  // 2. Total Planned Allocation (Sum of 5 categories: totalAllocatedRupees)
  // 3. Unallocated Budget = Total Budget - Total Planned Allocation
  const unallocatedBudgetRupees = totalBudgetRupees - totalAllocatedRupees;
  // 4. Eligible Expenses spent
  const monthlyExpensesRupees = summary ? summary.totalMonthlyExpensesPaise / 100 : 0;
  // 5. Budget Remaining = Total Budget - Eligible Expenses
  const remainingBudgetRupees = Math.max(0, totalBudgetRupees - monthlyExpensesRupees);
  // 6. Budget Utilization % = (Eligible Expenses / Total Budget) * 100
  const budgetUtilizationPercent = totalBudgetRupees > 0 ? Math.round((monthlyExpensesRupees / totalBudgetRupees) * 100) : 0;
  // 7. Monthly Inflow = Actual recorded income during selected month
  const monthlyInflowRupees = summary ? summary.totalMonthlyIncomePaise / 100 : 0;
  // 8. Unallocated Cushion = Monthly Inflow - Total Planned Allocation
  const unallocatedCushionRupees = monthlyInflowRupees - totalAllocatedRupees;

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMsg(null);
      await api.updateBudget({
        essentialBudgetInPaise: Math.round((parseFloat(essentialRupees) || 0) * 100),
        funBudgetInPaise: Math.round((parseFloat(funRupees) || 0) * 100),
        investmentBudgetInPaise: Math.round((parseFloat(investmentRupees) || 0) * 100),
        emergencyBudgetInPaise: Math.round((parseFloat(emergencyRupees) || 0) * 100),
        savingsBudgetInPaise: Math.round((parseFloat(savingsRupees) || 0) * 100),
        carryForwardEnabled: carryForward
      });
      await refreshAll();
      setStatusMsg('Budget allocation targets successfully updated!');
    } catch (err: any) {
      setStatusMsg('Failed to update budget: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const actuals = budgetData?.actuals || {};

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Income & Budget Allocation Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Allocate monthly budget into 5 defined buckets. Tracks planned targets vs. actual expenses and monthly cash inflow.
          </p>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Standard Budget Definition Ribbon: 4 Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Budget */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">1. Total Monthly Budget</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalBudgetRupees * 100)}
          </div>
          <span className="text-[11px] text-slate-400">Configured spending ceiling</span>
        </div>

        {/* 2. Total Planned Allocation */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">2. Total Planned Allocation</span>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(totalAllocatedRupees * 100)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of 5 planned bucket targets</span>
        </div>

        {/* 3. Unallocated Budget */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">3. Unallocated Budget Buffer</span>
          <div className={`text-xl font-bold font-mono mt-1 ${unallocatedBudgetRupees < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
            {formatINR(unallocatedBudgetRupees * 100)}
          </div>
          <span className="text-[11px] text-slate-400">
            {unallocatedBudgetRupees < 0 ? 'Planned exceeds budget ceiling' : 'Total Budget − Planned Allocation'}
          </span>
        </div>

        {/* 4. Budget Remaining to Spend */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">4. Budget Remaining to Spend</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(remainingBudgetRupees * 100)}
          </div>
          <span className="text-[11px] text-slate-400">
            {formatINR(monthlyExpensesRupees * 100)} spent ({budgetUtilizationPercent}% utilized)
          </span>
        </div>
      </div>

      {/* Monthly Inflow & Cashflow Cushion Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-xs text-slate-500 font-medium">Monthly Inflow (Recorded Income):</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(monthlyInflowRupees * 100)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
          <div>
            <span className="text-xs text-slate-500 font-medium">Inflow Cushion (Inflow − Planned Allocation):</span>
            <div className={`text-base font-bold font-mono ${unallocatedCushionRupees < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatINR(unallocatedCushionRupees * 100)}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 max-w-md">
          {unallocatedCushionRupees < 0
            ? 'Note: Planned allocations exceed currently credited income. As monthly income/salary is recorded, this cushion will normalize.'
            : 'Healthy liquid inflow buffer above planned category allocations.'}
        </p>
      </div>

      {/* 5 Real-Time Category Utilization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'Essential', label: '1. Essential', color: 'bg-blue-600', ring: 'text-blue-600', data: actuals.Essential },
          { key: 'Fun', label: '2. Fun & Lifestyle', color: 'bg-purple-600', ring: 'text-purple-600', data: actuals.Fun },
          { key: 'Investment', label: '3. Investment', color: 'bg-indigo-600', ring: 'text-indigo-600', data: actuals.Investment },
          { key: 'EmergencyFund', label: '4. Emergency Fund', color: 'bg-amber-600', ring: 'text-amber-600', data: actuals.EmergencyFund },
          { key: 'Savings', label: '5. Savings Goals', color: 'bg-emerald-600', ring: 'text-emerald-600', data: actuals.Savings },
        ].map(item => {
          const d = item.data || { budgetPaise: 0, spentPaise: 0, remainingPaise: 0, utilizationPercent: 0, exceededPaise: 0 };
          const isExceeded = (d.exceededPaise || 0) > 0;

          return (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{item.label}</span>
                  <span className={`text-[11px] font-mono font-semibold ${isExceeded ? 'text-red-500' : 'text-slate-500'}`}>
                    {d.utilizationPercent}%
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Budget:</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">{formatINR(d.budgetPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Spent / Moved:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatINR(d.spentPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Remaining:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(d.remainingPaise)}</span>
                  </div>
                </div>

                {isExceeded && (
                  <div className="mt-2 px-2 py-1 rounded bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[10px] text-red-600 dark:text-red-300 font-medium">
                    Exceeded by {formatINR(d.exceededPaise)}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isExceeded ? 'bg-red-500' : item.color}`}
                  style={{ width: `${Math.min(100, d.utilizationPercent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Form to Modify Monthly Budget Targets */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure Category Allocation Limits</h3>
            <p className="text-xs text-slate-500">Update budgeted ceilings for each category for this month.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={carryForward}
                onChange={e => setCarryForward(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Enable Carry-Forward of Unused Allocations</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                1. Essential (₹)
              </label>
              <input
                type="number"
                value={essentialRupees}
                onChange={e => setEssentialRupees(e.target.value)}
                placeholder="18000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                2. Fun & Lifestyle (₹)
              </label>
              <input
                type="number"
                value={funRupees}
                onChange={e => setFunRupees(e.target.value)}
                placeholder="4000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                3. Investment (₹)
              </label>
              <input
                type="number"
                value={investmentRupees}
                onChange={e => setInvestmentRupees(e.target.value)}
                placeholder="8000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                4. Emergency Fund (₹)
              </label>
              <input
                type="number"
                value={emergencyRupees}
                onChange={e => setEmergencyRupees(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                5. Savings Goals (₹)
              </label>
              <input
                type="number"
                value={savingsRupees}
                onChange={e => setSavingsRupees(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Allocation Targets'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
