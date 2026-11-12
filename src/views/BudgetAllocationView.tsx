import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart,
  Save,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  X,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const BudgetAllocationView: React.FC = () => {
  const { budgetData: contextBudgetData, summary, refreshAll } = useFinancial();

  // Selected Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Local state for current month's budget data
  const [monthBudgetData, setMonthBudgetData] = useState<any>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Category bucket allocations (in Rupees)
  const [essentialRupees, setEssentialRupees] = useState('');
  const [funRupees, setFunRupees] = useState('');
  const [investmentRupees, setInvestmentRupees] = useState('');
  const [emergencyRupees, setEmergencyRupees] = useState('');
  const [savingsRupees, setSavingsRupees] = useState('');
  const [carryForward, setCarryForward] = useState(false);

  // Category saving state
  const [savingAllocations, setSavingAllocations] = useState(false);

  // Editable Total Monthly Budget state
  const [isEditingTotalBudget, setIsEditingTotalBudget] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [isSavingTotalBudget, setIsSavingTotalBudget] = useState(false);
  const [totalBudgetError, setTotalBudgetError] = useState<string | null>(null);

  // General Status notifications
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load budget data for selected month
  const loadMonthBudget = useCallback(async (month: string) => {
    try {
      setLoadingMonth(true);
      const res = await api.getBudget(month);
      if (res) {
        setMonthBudgetData(res);
        if (res.allocation) {
          const a = res.allocation;
          setEssentialRupees((a.essentialBudgetInPaise / 100).toString());
          setFunRupees((a.funBudgetInPaise / 100).toString());
          setInvestmentRupees((a.investmentBudgetInPaise / 100).toString());
          setEmergencyRupees((a.emergencyBudgetInPaise / 100).toString());
          setSavingsRupees((a.savingsBudgetInPaise / 100).toString());
          setCarryForward(Boolean(a.carryForwardEnabled));
        }
      }
    } catch (err: any) {
      console.error('Failed to load month budget:', err);
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  // When selectedMonth changes, load its data
  useEffect(() => {
    loadMonthBudget(selectedMonth);
  }, [selectedMonth, loadMonthBudget]);

  // Sync with context if it's the current month and context updates
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectedMonth === currentMonth && contextBudgetData) {
      setMonthBudgetData(contextBudgetData);
      if (contextBudgetData.allocation && !isEditingTotalBudget) {
        const a = contextBudgetData.allocation;
        setEssentialRupees((a.essentialBudgetInPaise / 100).toString());
        setFunRupees((a.funBudgetInPaise / 100).toString());
        setInvestmentRupees((a.investmentBudgetInPaise / 100).toString());
        setEmergencyRupees((a.emergencyBudgetInPaise / 100).toString());
        setSavingsRupees((a.savingsBudgetInPaise / 100).toString());
        setCarryForward(Boolean(a.carryForwardEnabled));
      }
    }
  }, [contextBudgetData, selectedMonth, isEditingTotalBudget]);

  // Active budget data (prioritize monthBudgetData, fallback to contextBudgetData)
  const activeData = monthBudgetData || contextBudgetData;

  // 1. Total Monthly Budget (Configured ceiling in Rupees)
  const totalBudgetPaise =
    activeData?.totalBudgetPaise ??
    activeData?.allocation?.totalBudgetInPaise ??
    summary?.monthlyBudgetPaise ??
    4000000;
  const totalBudgetRupees = totalBudgetPaise / 100;

  // 2. Total Planned Allocation (Sum of 5 planned bucket targets in Rupees)
  const totalAllocatedRupees =
    (parseFloat(essentialRupees) || 0) +
    (parseFloat(funRupees) || 0) +
    (parseFloat(investmentRupees) || 0) +
    (parseFloat(emergencyRupees) || 0) +
    (parseFloat(savingsRupees) || 0);

  // 3. Unallocated Budget Buffer = Total Monthly Budget - Total Planned Allocation
  const unallocatedBudgetRupees = totalBudgetRupees - totalAllocatedRupees;
  const isOverAllocated = unallocatedBudgetRupees < 0;

  // 4. Actual eligible monthly expenses
  const actuals = activeData?.actuals || {};
  const essentialSpentRupees = (actuals.Essential?.spentPaise || 0) / 100;
  const funSpentRupees = (actuals.Fun?.spentPaise || 0) / 100;
  const eligibleExpensesRupees =
    activeData?.eligibleExpensesPaise !== undefined
      ? activeData.eligibleExpensesPaise / 100
      : essentialSpentRupees + funSpentRupees;

  // 5. Budget Remaining to Spend = Total Monthly Budget - Eligible Expenses
  const remainingBudgetRupees = totalBudgetRupees - eligibleExpensesRupees;

  // 6. Budget Utilization % = (Eligible Expenses / Total Monthly Budget) * 100
  const budgetUtilizationPercent =
    totalBudgetRupees > 0
      ? Math.round((eligibleExpensesRupees / totalBudgetRupees) * 100)
      : 0;

  // 7. Monthly Inflow & Cushion
  const monthlyInflowRupees = (activeData?.monthlyInflowPaise || 0) / 100;
  const unallocatedCushionRupees = monthlyInflowRupees - totalAllocatedRupees;

  // Initialize total budget input when starting edit
  const handleStartEditTotalBudget = () => {
    setTotalBudgetInput(totalBudgetRupees.toString());
    setTotalBudgetError(null);
    setIsEditingTotalBudget(true);
  };

  const handleCancelEditTotalBudget = () => {
    setIsEditingTotalBudget(false);
    setTotalBudgetInput('');
    setTotalBudgetError(null);
  };

  // Save Total Monthly Budget
  const handleSaveTotalBudget = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTotalBudgetError(null);

    const trimmed = totalBudgetInput.trim();
    if (!trimmed) {
      setTotalBudgetError('Budget amount cannot be empty.');
      return;
    }

    const parsedNum = parseFloat(trimmed);
    if (isNaN(parsedNum) || !isFinite(parsedNum)) {
      setTotalBudgetError('Please enter a valid numeric amount.');
      return;
    }

    if (parsedNum <= 0) {
      setTotalBudgetError('Monthly budget must be a positive number greater than zero.');
      return;
    }

    const newBudgetPaise = Math.round(parsedNum * 100);

    try {
      setIsSavingTotalBudget(true);
      const res = await api.updateTotalBudget({
        monthYear: selectedMonth,
        totalBudgetInPaise: newBudgetPaise
      });

      // Update local month data immediately with verified response
      if (res && res.allocation) {
        setMonthBudgetData(res);
      }

      // Refresh global financial context so dashboard summary updates
      await refreshAll();

      setIsEditingTotalBudget(false);
      setStatusMsg({
        type: 'success',
        text: `Total monthly budget updated to ${formatINR(newBudgetPaise)} for ${selectedMonth}!`
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update total budget:', err);
      const errMsg = err?.message || 'Failed to save monthly budget';
      setTotalBudgetError(errMsg);
      setStatusMsg({
        type: 'error',
        text: errMsg
      });
    } finally {
      setIsSavingTotalBudget(false);
    }
  };

  // Save 5 Category Bucket Allocations (preserves total budget)
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAllocations(true);
      setStatusMsg(null);
      await api.updateBudget({
        monthYear: selectedMonth,
        essentialBudgetInPaise: Math.round((parseFloat(essentialRupees) || 0) * 100),
        funBudgetInPaise: Math.round((parseFloat(funRupees) || 0) * 100),
        investmentBudgetInPaise: Math.round((parseFloat(investmentRupees) || 0) * 100),
        emergencyBudgetInPaise: Math.round((parseFloat(emergencyRupees) || 0) * 100),
        savingsBudgetInPaise: Math.round((parseFloat(savingsRupees) || 0) * 100),
        carryForwardEnabled: carryForward
      });
      await loadMonthBudget(selectedMonth);
      await refreshAll();
      setStatusMsg({
        type: 'success',
        text: 'Category allocation targets successfully saved to database!'
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: 'Failed to update category allocations: ' + err.message
      });
    } finally {
      setSavingAllocations(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Month Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Income & Budget Allocation Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Allocate monthly budget into 5 defined buckets. Tracks planned targets vs. actual expenses and monthly cash inflow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label htmlFor="budget-month-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Month:
            </label>
            <input
              id="budget-month-select"
              type="month"
              value={selectedMonth}
              onChange={e => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="text-xs font-semibold text-slate-800 dark:text-white bg-transparent border-none focus:outline-hidden focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Status Message Pill */}
          {statusMsg && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Over-Allocation Warning Indicator if Planned > Total Budget */}
      {isOverAllocated && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Planned Allocations Exceed Total Monthly Budget Ceiling
            </h4>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Total planned bucket allocations (
              <span className="font-mono font-semibold tabular-nums">
                {formatINR(totalAllocatedRupees * 100)}
              </span>
              ) exceed your monthly budget ceiling (
              <span className="font-mono font-semibold tabular-nums">
                {formatINR(totalBudgetRupees * 100)}
              </span>
              ) by{' '}
              <span className="font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
                {formatINR(Math.abs(unallocatedBudgetRupees) * 100)}
              </span>
              . Existing bucket allocations are preserved. You can increase the monthly budget or reduce category amounts to rebalance.
            </p>
          </div>
        </div>
      )}

      {/* Standard Budget Definition Ribbon: 4 Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Monthly Budget (EDITABLE) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">1. Total Monthly Budget</span>
              {!isEditingTotalBudget && (
                <button
                  type="button"
                  onClick={handleStartEditTotalBudget}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                  title="Edit Total Monthly Budget"
                  aria-label="Edit Total Monthly Budget"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Display / Inline Edit Mode */}
            {isEditingTotalBudget ? (
              <form onSubmit={handleSaveTotalBudget} className="mt-2 space-y-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-sm font-semibold text-slate-400 font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    autoFocus
                    value={totalBudgetInput}
                    onChange={e => {
                      setTotalBudgetInput(e.target.value);
                      if (totalBudgetError) setTotalBudgetError(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') handleCancelEditTotalBudget();
                    }}
                    placeholder="e.g. 45000"
                    min="1"
                    step="100"
                    className="w-full pl-7 pr-3 py-1.5 text-base font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-blue-500 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 tabular-nums"
                  />
                </div>

                {totalBudgetError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {totalBudgetError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingTotalBudget}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingTotalBudget ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTotalBudget}
                    disabled={isSavingTotalBudget}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatINR(totalBudgetRupees * 100)}
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Configured spending ceiling for {selectedMonth}
          </span>
        </div>

        {/* 2. Total Planned Allocation */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">2. Total Planned Allocation</span>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
              {formatINR(totalAllocatedRupees * 100)}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Sum of 5 planned bucket targets
          </span>
        </div>

        {/* 3. Unallocated Budget Buffer */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">3. Unallocated Budget Buffer</span>
            <div
              className={`text-xl font-bold font-mono mt-1 tabular-nums ${
                isOverAllocated
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {unallocatedBudgetRupees < 0 ? '-' : ''}
              {formatINR(Math.abs(unallocatedBudgetRupees) * 100)}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {isOverAllocated
              ? `Shortfall of ${formatINR(Math.abs(unallocatedBudgetRupees) * 100)}`
              : 'Total Budget − Planned Allocation'}
          </span>
        </div>

        {/* 4. Budget Remaining to Spend */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">4. Budget Remaining to Spend</span>
            <div
              className={`text-xl font-bold font-mono mt-1 tabular-nums ${
                remainingBudgetRupees < 0
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {remainingBudgetRupees < 0 ? '-' : ''}
              {formatINR(Math.abs(remainingBudgetRupees) * 100)}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {formatINR(eligibleExpensesRupees * 100)} spent ({budgetUtilizationPercent}% utilized)
          </span>
        </div>
      </div>

      {/* Monthly Inflow & Cashflow Cushion Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-xs text-slate-500 font-medium">Monthly Inflow (Recorded Income):</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(monthlyInflowRupees * 100)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
          <div>
            <span className="text-xs text-slate-500 font-medium">Inflow Cushion (Inflow − Planned Allocation):</span>
            <div
              className={`text-base font-bold font-mono tabular-nums ${
                unallocatedCushionRupees < 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {unallocatedCushionRupees < 0 ? '-' : ''}
              {formatINR(Math.abs(unallocatedCushionRupees) * 100)}
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
          { key: 'Essential', label: '1. Essential', color: 'bg-blue-600', data: actuals.Essential },
          { key: 'Fun', label: '2. Fun & Lifestyle', color: 'bg-purple-600', data: actuals.Fun },
          { key: 'Investment', label: '3. Investment', color: 'bg-indigo-600', data: actuals.Investment },
          { key: 'EmergencyFund', label: '4. Emergency Fund', color: 'bg-amber-600', data: actuals.EmergencyFund },
          { key: 'Savings', label: '5. Savings Goals', color: 'bg-emerald-600', data: actuals.Savings },
        ].map(item => {
          const d = item.data || {
            budgetPaise: 0,
            spentPaise: 0,
            remainingPaise: 0,
            utilizationPercent: 0,
            exceededPaise: 0
          };
          const isExceeded = (d.exceededPaise || 0) > 0;

          return (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{item.label}</span>
                  <span
                    className={`text-[11px] font-mono font-semibold tabular-nums ${
                      isExceeded ? 'text-red-500' : 'text-slate-500'
                    }`}
                  >
                    {d.utilizationPercent}%
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Budget:</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold tabular-nums">
                      {formatINR(d.budgetPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Spent / Moved:</span>
                    <span className="font-mono text-slate-900 dark:text-white tabular-nums">
                      {formatINR(d.spentPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Remaining:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatINR(d.remainingPaise)}
                    </span>
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
                  style={{ width: `${Math.min(100, Math.max(0, d.utilizationPercent))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Form to Modify Category Allocation Targets */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Configure Category Allocation Limits ({selectedMonth})
            </h3>
            <p className="text-xs text-slate-500">
              Update budgeted ceilings for each category. Changing categories does not modify your Total Monthly Budget.
            </p>
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
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
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
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
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
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
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
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
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
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Total Planned: <strong className="font-mono text-slate-900 dark:text-white tabular-nums">{formatINR(totalAllocatedRupees * 100)}</strong>
            </span>
            <button
              type="submit"
              disabled={savingAllocations}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingAllocations ? 'Saving...' : 'Save Category Allocations'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
