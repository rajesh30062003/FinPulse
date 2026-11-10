import React, { useState } from 'react';
import { History, Search, Filter, Download, Trash2, Edit2, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';
import { ITransaction } from '../types';

export const TransactionsView: React.FC = () => {
  const { transactions, refreshAll } = useFinancial();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedTx, setSelectedTx] = useState<ITransaction | null>(null);

  const filtered = transactions.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      const match = (t.description || '').toLowerCase().includes(q) || (t.subCategory || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (categoryFilter && t.mainCategory !== categoryFilter) return false;
    if (methodFilter && t.paymentMethod !== methodFilter) return false;
    if (typeFilter && t.type !== typeFilter) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction? The system will atomically reverse its balance and budget effects.')) {
      try {
        await api.deleteTransaction(id);
        await refreshAll();
        if (selectedTx?.id === id) setSelectedTx(null);
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/transactions/export/csv';
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Financial Transaction History & Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete immutable ledger. Deleting or editing any transaction atomically restores the previous account balance and allocation.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Full CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search description, subcategory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="Essential">Essential</option>
            <option value="Fun">Fun</option>
            <option value="Investment">Investment</option>
            <option value="Emergency Fund">Emergency Fund</option>
            <option value="Savings">Savings</option>
            <option value="Transfer">Transfer</option>
            <option value="Liability Settlement">Liability Settlement</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Account">Bank Account</option>
            <option value="Credit Card">Credit Card</option>
            <option value="UPI">UPI</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="credit_card_expense">Credit Card Expense</option>
            <option value="credit_card_payment">CC Bill Payment</option>
            <option value="transfer">Bank Transfer</option>
            <option value="cash_withdrawal">Cash Withdrawal</option>
            <option value="investment_deposit">Investment Deposit</option>
            <option value="emergency_deposit">Emergency Fund</option>
          </select>

          {(search || categoryFilter || methodFilter || typeFilter) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setMethodFilter(''); setTypeFilter(''); }}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Payment Method</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const isIncome = t.type === 'income';
                  const isSettlement = t.type === 'credit_card_payment';
                  const isTransfer = t.type === 'transfer' || t.type === 'cash_withdrawal' || t.type === 'cash_deposit';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          isIncome
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : isSettlement
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : isTransfer
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300'
                        }`}>
                          {t.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {t.description}
                        {t.notes && <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">{t.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {t.mainCategory} · {t.subCategory}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {t.paymentMethod}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isSettlement
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {isIncome ? '+' : '-'}{formatINR(t.amountInPaise)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(t.id)}
                          title="Reverse and delete transaction"
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
