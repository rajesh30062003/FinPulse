import React, { useState } from 'react';
import { Receipt, Plus, Filter, CreditCard, Wallet, Landmark } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { formatINR } from '../services/api';

export const ExpensesView: React.FC = () => {
  const { transactions, setIsAddTxOpen, setAddTxDefaultType } = useFinancial();

  const [activeFilter, setActiveFilter] = useState<'all' | 'Essential' | 'Fun' | 'Investment'>('all');

  const expenseTxs = transactions.filter(t => t.type === 'expense' || t.type === 'credit_card_expense');
  const filteredTxs = activeFilter === 'all'
    ? expenseTxs
    : expenseTxs.filter(t => t.mainCategory === activeFilter);

  const totalExpensePaise = expenseTxs.reduce((sum, t) => sum + t.amountInPaise, 0);
  const essentialPaise = expenseTxs.filter(t => t.mainCategory === 'Essential').reduce((sum, t) => sum + t.amountInPaise, 0);
  const funPaise = expenseTxs.filter(t => t.mainCategory === 'Fun').reduce((sum, t) => sum + t.amountInPaise, 0);
  const ccPaise = expenseTxs.filter(t => t.paymentMethod === 'Credit Card').reduce((sum, t) => sum + t.amountInPaise, 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-500" />
            Daily Expense Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Categorize spending into Essential, Fun, or Investment. Cash, bank transfers, and credit card purchases update balances in real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setAddTxDefaultType('expense');
            setIsAddTxOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Aggregate Expense Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Monthly Expenses</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalExpensePaise)}
          </div>
          <span className="text-[11px] text-slate-400">Total outflow across all categories</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Essential Expenses</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {formatINR(essentialPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Rent, groceries, utilities, health</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Fun & Entertainment</span>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {formatINR(funPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Dining, movies, hobbies, trips</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Credit Card Purchases</span>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {formatINR(ccPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Recorded as expense, bank untouched</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {(['all', 'Essential', 'Fun', 'Investment'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'all' ? 'All Expenses' : tab}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {filteredTxs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No expenses found in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Subcategory</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Paid Via</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTxs.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-slate-400">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {t.mainCategory}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">
                      {t.subCategory}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {t.description}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {t.paymentMethod}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      -{formatINR(t.amountInPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
