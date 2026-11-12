import React, { useState } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const InvestmentsView: React.FC = () => {
  const { investmentsData, accounts, refreshAll } = useFinancial();

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValuationRupees, setEditValuationRupees] = useState('');

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState('Mutual Funds');
  const [investedAmountRupees, setInvestedAmountRupees] = useState('');
  const [currentValuationRupees, setCurrentValuationRupees] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('');
  const [riskLevel, setRiskLevel] = useState<'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk'>('Moderate Risk');
  const [sourceAccountId, setSourceAccountId] = useState(activeAccounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const investments = investmentsData?.investments || [];
  const totalInvestedPaise = investmentsData?.totalInvestedInPaise || 0;
  const totalCurrentPaise = investmentsData?.totalCurrentValueInPaise || 0;
  const totalGainLossPaise = investmentsData?.totalGainLossInPaise || 0;
  const returnPercentage = investmentsData?.returnPercentage || 0;

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const invPaise = Math.round((parseFloat(investedAmountRupees) || 0) * 100);
      const currPaise = currentValuationRupees
        ? Math.round((parseFloat(currentValuationRupees) || 0) * 100)
        : invPaise;

      await api.createInvestment({
        name,
        type,
        investedAmountInPaise: invPaise,
        currentValueInPaise: currPaise,
        expectedReturnRate: expectedReturnRate ? parseFloat(expectedReturnRate) : undefined,
        riskLevel,
        sourceAccountId,
        notes
      });
      await refreshAll();
      setIsAddOpen(false);
      setName('');
      setInvestedAmountRupees('');
      setCurrentValuationRupees('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveValuation = async (id: string) => {
    try {
      const valPaise = Math.round((parseFloat(editValuationRupees) || 0) * 100);
      await api.updateInvestmentValuation(id, valPaise);
      await refreshAll();
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (confirm('Delete this investment asset record?')) {
      await api.deleteInvestment(id);
      await refreshAll();
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Investment Portfolio & Asset Allocation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track mutual funds, equities, and bonds. Asset valuation updates reflect portfolio growth without inflating ordinary monthly income.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Investment</span>
        </button>
      </div>

      {/* Portfolio Totals Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Invested Principal</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalInvestedPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Total cash committed</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Current Portfolio Value</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {formatINR(totalCurrentPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Latest recorded market valuation</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Profit / Loss</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${totalGainLossPaise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {totalGainLossPaise >= 0 ? '+' : ''}{formatINR(totalGainLossPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Unrealized portfolio return</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Net Portfolio Return</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${returnPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {returnPercentage >= 0 ? '+' : ''}{returnPercentage}%
          </div>
          <span className="text-[11px] text-slate-400">ROI across {investments.length} holdings</span>
        </div>
      </div>

      {/* Investment Holdings Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Asset Holdings</h3>

        {investments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No investment holdings recorded. Click "Add Investment" to log mutual funds or stocks.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Asset Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Risk Tier</th>
                  <th className="pb-2 font-medium text-right">Invested Principal</th>
                  <th className="pb-2 font-medium text-right">Current Valuation</th>
                  <th className="pb-2 font-medium text-right">Gain / Loss</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {investments.map((inv: any) => {
                  const gain = inv.currentValueInPaise - inv.investedAmountInPaise;
                  const ret = inv.investedAmountInPaise > 0
                    ? ((gain / inv.investedAmountInPaise) * 100).toFixed(1)
                    : '0';
                  const isEditing = editingId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {inv.name}
                        {inv.notes && <span className="block text-[10px] text-slate-400 font-normal">{inv.notes}</span>}
                      </td>
                      <td className="py-3 text-slate-500">
                        {inv.type}
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {inv.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(inv.investedAmountInPaise)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editValuationRupees}
                              onChange={e => setEditValuationRupees(e.target.value)}
                              className="w-24 px-1.5 py-0.5 border border-blue-500 rounded text-xs font-mono text-right"
                            />
                            <button
                              onClick={() => handleSaveValuation(inv.id)}
                              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px]"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span>{formatINR(inv.currentValueInPaise)}</span>
                        )}
                      </td>
                      <td className={`py-3 text-right font-mono font-semibold ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {gain >= 0 ? '+' : ''}{formatINR(gain)} ({ret}%)
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingId(inv.id);
                              setEditValuationRupees((inv.currentValueInPaise / 100).toString());
                            }}
                            title="Update market valuation"
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvestment(inv.id)}
                            title="Delete"
                            className="p-1 rounded text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Investment Asset</h2>
            <form onSubmit={handleCreateInvestment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parag Parikh Flexi Cap Fund"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Mutual Funds">Mutual Funds</option>
                    <option value="Stocks">Stocks</option>
                    <option value="Gold">Gold</option>
                    <option value="Bonds">Bonds</option>
                    <option value="Recurring Deposit">Recurring Deposit</option>
                    <option value="Other Investments">Other Investments</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Risk Tier</label>
                  <select
                    value={riskLevel}
                    onChange={e => setRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Very Low Risk">Very Low Risk</option>
                    <option value="Low Risk">Low Risk</option>
                    <option value="Moderate Risk">Moderate Risk</option>
                    <option value="High Risk">High Risk</option>
                    <option value="Very High Risk">Very High Risk</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Invested Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={investedAmountRupees}
                    onChange={e => setInvestedAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Current Valuation (₹)</label>
                  <input
                    type="number"
                    placeholder="Leave empty if same"
                    value={currentValuationRupees}
                    onChange={e => setCurrentValuationRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Fund From Bank Account</label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">No bank deduction (already funded)</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({formatINR(a.balanceInPaise)})</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Save Investment
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
