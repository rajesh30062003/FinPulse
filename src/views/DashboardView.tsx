import React from 'react';
import {
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  Receipt,
  PiggyBank,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { formatINR } from '../services/api';

export const DashboardView: React.FC = () => {
  const {
    summary,
    accounts,
    creditCards,
    fixedDeposits,
    setIsAddTxOpen,
    setIsPayBillOpen,
    setSelectedCardForBill,
    setActiveTab,
    isLoading
  } = useFinancial();

  if (isLoading && !summary) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const s = summary || {
    totalAvailableMoneyPaise: 0,
    totalBankPaise: 0,
    totalCashPaise: 0,
    totalCCOutstandingPaise: 0,
    totalMonthlyIncomePaise: 0,
    totalMonthlyExpensesPaise: 0,
    totalInvestedPaise: 0,
    totalCurrentInvestmentsPaise: 0,
    emergencyFundBalancePaise: 0,
    emergencyFundTargetPaise: 10000000,
    totalSavingsPaise: 0,
    monthlyBudgetPaise: 4000000,
    remainingBudgetPaise: 0,
    upcomingBills: [],
    upcomingFDs: [],
    recentTransactions: [],
    monthlySpendingSummary: { essentialPaise: 0, funPaise: 0, otherPaise: 0 }
  };

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');
  const activeCards = creditCards.filter(c => c.isActive !== false && c.status !== 'Closed');

  const investmentGainPaise = s.totalCurrentInvestmentsPaise - s.totalInvestedPaise;
  const investmentGainPercent = s.totalInvestedPaise > 0
    ? ((investmentGainPaise / s.totalInvestedPaise) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero Financial Position Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider">
            <span>TOTAL LIQUID AVAILABLE WEALTH</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">CASH + BANK ACCOUNTS ONLY</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono">
            {formatINR(s.totalAvailableMoneyPaise)}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Calculated strictly from cleared cash and bank deposits. Excludes credit card debt and illiquid investment reserves.
          </p>
        </div>

        {/* Quick Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddTxOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
          <button
            onClick={() => setIsPayBillOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Pay Credit Card</span>
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Bank Transfer</span>
          </button>
        </div>
      </div>

      {/* 8 Primary Financial Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Bank Accounts */}
        <div
          onClick={() => setActiveTab('banks')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Bank Balance</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.totalBankPaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            {activeAccounts.length} active account{activeAccounts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* 2. Cash Wallet */}
        <div
          onClick={() => setActiveTab('cash')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cash on Hand</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.totalCashPaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            Physical currency reserve
          </div>
        </div>

        {/* 3. Credit Card Outstanding */}
        <div
          onClick={() => setActiveTab('credit-cards')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Credit Card Debt</span>
            <CreditCard className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
            {formatINR(s.totalCCOutstandingPaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            {activeCards.length} active card{activeCards.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* 4. Monthly Budget Remaining */}
        <div
          onClick={() => setActiveTab('budget')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Budget Remaining</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.remainingBudgetPaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            {formatINR(s.totalMonthlyExpensesPaise)} spent of {formatINR(s.monthlyBudgetPaise)} budget
          </div>
        </div>

        {/* 5. Monthly Income */}
        <div
          onClick={() => setActiveTab('income')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(s.totalMonthlyIncomePaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            Current calendar month
          </div>
        </div>

        {/* 6. Monthly Expenses */}
        <div
          onClick={() => setActiveTab('expenses')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Expenses</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.totalMonthlyExpensesPaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            Cash, bank, and card spend
          </div>
        </div>

        {/* 7. Investment Portfolio */}
        <div
          onClick={() => setActiveTab('investments')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Investments</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.totalCurrentInvestmentsPaise)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Gain: +{formatINR(investmentGainPaise)} ({investmentGainPercent}%)
          </div>
        </div>

        {/* 8. Emergency Fund */}
        <div
          onClick={() => setActiveTab('emergency-fund')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Emergency Fund</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {formatINR(s.emergencyFundBalancePaise)}
          </div>
          <div className="text-[11px] text-slate-400">
            {Math.round((s.emergencyFundBalancePaise / s.emergencyFundTargetPaise) * 100)}% of target
          </div>
        </div>
      </div>

      {/* Middle Grid: Upcoming Bills & Upcoming FD Maturities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Credit Card Bills */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Credit Card Bills</h3>
            </div>
            <button
              onClick={() => setActiveTab('credit-card-bills')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View All
            </button>
          </div>

          {s.upcomingBills.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No outstanding credit card bills. All cards settled!
            </div>
          ) : (
            <div className="space-y-2.5">
              {s.upcomingBills.map(bill => (
                <div
                  key={bill.cardId}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {bill.cardName} (•••• {bill.lastFourDigits})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Payment due on the {bill.dueDay}th of month
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                      {formatINR(bill.outstandingPaise)}
                    </span>
                    <button
                      onClick={() => {
                        const c = creditCards.find(item => item.id === bill.cardId);
                        if (c) setSelectedCardForBill(c);
                        setIsPayBillOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                    >
                      Pay Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Fixed Deposit Maturities */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming FD Maturities</h3>
            </div>
            <button
              onClick={() => setActiveTab('fixed-deposits')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Manage FDs
            </button>
          </div>

          {s.upcomingFDs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No active Fixed Deposits approaching maturity.
            </div>
          ) : (
            <div className="space-y-2.5">
              {s.upcomingFDs.map(fd => (
                <div
                  key={fd.fdId}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {fd.fdName} ({fd.bankName})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Matures on {new Date(fd.maturityDate).toLocaleDateString()} · {fd.daysRemaining} days left
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatINR(fd.maturityAmountPaise)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Principal: {formatINR(fd.principalPaise)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions & Spending Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {s.recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No recent transactions recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {s.recentTransactions.map(tx => {
                    const isPositive = tx.type === 'income';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 font-mono text-slate-400">
                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {tx.description}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {tx.mainCategory} · {tx.subCategory}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {tx.paymentMethod}
                        </td>
                        <td className={`py-2.5 text-right font-mono font-semibold ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {isPositive ? '+' : '-'}{formatINR(tx.amountInPaise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Spending Breakdown (1 col) */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Spending Breakdown</h3>

          <div className="space-y-4 text-xs">
            {/* Essential */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Essential Expenses</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatINR(s.monthlySpendingSummary.essentialPaise)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${Math.min(100, s.totalMonthlyExpensesPaise > 0 ? (s.monthlySpendingSummary.essentialPaise / s.totalMonthlyExpensesPaise) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Fun */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Fun & Lifestyle</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatINR(s.monthlySpendingSummary.funPaise)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{
                    width: `${Math.min(100, s.totalMonthlyExpensesPaise > 0 ? (s.monthlySpendingSummary.funPaise / s.totalMonthlyExpensesPaise) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Other */}
            {s.monthlySpendingSummary.otherPaise > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Other Outflows</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatINR(s.monthlySpendingSummary.otherPaise)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (s.monthlySpendingSummary.otherPaise / s.totalMonthlyExpensesPaise) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Total Monthly Outflow</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatINR(s.totalMonthlyExpensesPaise)}</span>
            </div>

            <button
              onClick={() => setActiveTab('budget')}
              className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
            >
              Adjust Category Budgets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
