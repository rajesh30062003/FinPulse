import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  PieChart as PieIcon,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useFinancial } from '../context/FinancialContext';
import { formatINR, getApiBase } from '../services/api';

const COLORS = ['#2563eb', '#9333ea', '#059669', '#d97706', '#dc2626', '#0284c7', '#4b5563'];

export const AnalyticsView: React.FC = () => {
  const { transactions, accounts, cash, budgetData, investmentsData, summary } = useFinancial();
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');

  // 1. Expense Distribution Data
  const expenseTxs = transactions.filter(t => t.type === 'expense' || t.type === 'credit_card_expense');
  const catTotals: Record<string, number> = {};
  expenseTxs.forEach(t => {
    const key = t.subCategory || t.mainCategory;
    catTotals[key] = (catTotals[key] || 0) + t.amountInPaise / 100;
  });

  const expensePieData = Object.keys(catTotals).map(k => ({
    name: k,
    value: catTotals[k]
  })).slice(0, 7);

  // 2. Income vs Expense Data
  const incomePaise = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amountInPaise, 0);
  const expensePaise = expenseTxs.reduce((sum, t) => sum + t.amountInPaise, 0);

  const incomeVsExpenseData = [
    { name: 'Financial Flows', Income: incomePaise / 100, Expenses: expensePaise / 100 }
  ];

  // 3. Spending Trend Line Data (grouped by date)
  const dateTotals: Record<string, number> = {};
  expenseTxs.forEach(t => {
    const day = t.date.split('T')[0];
    dateTotals[day] = (dateTotals[day] || 0) + t.amountInPaise / 100;
  });
  const spendingTrendData = Object.keys(dateTotals).sort().map(d => ({
    date: d.slice(5),
    Spent: dateTotals[d]
  }));

  // 4. Investment Portfolio Distribution
  const investments = investmentsData?.investments || [];
  const invTypeTotals: Record<string, number> = {};
  investments.forEach((i: any) => {
    invTypeTotals[i.type] = (invTypeTotals[i.type] || 0) + i.currentValueInPaise / 100;
  });
  const invPieData = Object.keys(invTypeTotals).map(k => ({
    name: k,
    value: invTypeTotals[k]
  }));

  // 5. Account Balance Distribution
  const balanceBarData = [
    ...accounts.map(a => ({ name: a.bankName.replace(' Bank', ''), Balance: a.balanceInPaise / 100 })),
    { name: 'Physical Cash', Balance: (cash?.balanceInPaise || 0) / 100 }
  ];

  // 6. Budget Utilization Donut Data
  const bAlloc = budgetData?.allocation;
  const totalAllocatedPaise = bAlloc
    ? bAlloc.essentialBudgetInPaise + bAlloc.funBudgetInPaise + bAlloc.investmentBudgetInPaise
    : 3000000;
  const spentPaise = expensePaise;
  const remainingPaise = Math.max(0, totalAllocatedPaise - spentPaise);

  const budgetDonutData = [
    { name: 'Spent Amount', value: spentPaise / 100 },
    { name: 'Remaining Headroom', value: remainingPaise / 100 }
  ];

  const handleExportCSV = () => {
    window.location.href = `${getApiBase()}/transactions/export/csv`;
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Financial Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual breakdown of outflows, asset allocation, cash vs. bank distribution, and budget discipline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${period === 'weekly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${period === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${period === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Yearly
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {/* Grid: Chart Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Expense Distribution (Pie Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              Expense Distribution by Subcategory
            </h3>
            <span className="text-xs text-slate-400 font-mono">Total: {formatINR(expensePaise)}</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={30}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Income vs Expense (Bar Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Total Inflow vs Total Outflow
            </h3>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
              Net Surplus: {formatINR(Math.max(0, incomePaise - expensePaise))}
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Bar dataKey="Income" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Spending Trend Over Time (Line Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Daily Spending Timeline
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']} />
                <Line type="monotone" dataKey="Spent" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Investment Portfolio Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Investment Asset Diversification
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={invPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                >
                  {invPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Valuation']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart E: Account Balance Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Account Balance Holdings Distribution
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceBarData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Balance']} />
                <Bar dataKey="Balance" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart F: Budget Utilization Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Budget Ceiling Utilization
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                >
                  <Cell fill="#dc2626" />
                  <Cell fill="#16a34a" />
                </Pie>
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
