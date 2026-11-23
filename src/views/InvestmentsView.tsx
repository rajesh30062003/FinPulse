import React, { useState } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, X, Sliders, Check } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';
import { IInvestment } from '../types';

export const InvestmentsView: React.FC = () => {
  const { investmentsData, accounts, refreshAll } = useFinancial();

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');

  // Modals & Edit States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<IInvestment | null>(null);
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickEditValuationRupees, setQuickEditValuationRupees] = useState('');

  // Add Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Mutual Funds');
  const [investedAmountRupees, setInvestedAmountRupees] = useState('');
  const [currentValuationRupees, setCurrentValuationRupees] = useState('');
  const [units, setUnits] = useState('');
  const [buyPriceRupees, setBuyPriceRupees] = useState('');
  const [currentPriceRupees, setCurrentPriceRupees] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('');
  const [riskLevel, setRiskLevel] = useState<'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk'>('Moderate Risk');
  const [sourceAccountId, setSourceAccountId] = useState(activeAccounts[0]?.id || '');
  const [notes, setNotes] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Mutual Funds');
  const [editInvestedAmountRupees, setEditInvestedAmountRupees] = useState('');
  const [editCurrentValuationRupees, setEditCurrentValuationRupees] = useState('');
  const [editUnits, setEditUnits] = useState('');
  const [editBuyPriceRupees, setEditBuyPriceRupees] = useState('');
  const [editCurrentPriceRupees, setEditCurrentPriceRupees] = useState('');
  const [editExpectedReturnRate, setEditExpectedReturnRate] = useState('');
  const [editRiskLevel, setEditRiskLevel] = useState<'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk'>('Moderate Risk');
  const [editNotes, setEditNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const investments: IInvestment[] = investmentsData?.investments || [];
  const totalInvestedPaise = investmentsData?.totalInvestedInPaise || 0;
  const totalCurrentPaise = investmentsData?.totalCurrentValueInPaise || 0;
  const totalGainLossPaise = investmentsData?.totalGainLossInPaise || 0;
  const returnPercentage = investmentsData?.returnPercentage || 0;

  // Auto-calculate principal and current value from units in Add form
  const handleUnitsChange = (val: string) => {
    setUnits(val);
    const u = parseFloat(val);
    const bp = parseFloat(buyPriceRupees);
    const cp = parseFloat(currentPriceRupees);
    if (!isNaN(u) && u > 0 && !isNaN(bp) && bp > 0) {
      setInvestedAmountRupees((u * bp).toFixed(2));
    }
    if (!isNaN(u) && u > 0 && !isNaN(cp) && cp > 0) {
      setCurrentValuationRupees((u * cp).toFixed(2));
    }
  };

  const handleBuyPriceChange = (val: string) => {
    setBuyPriceRupees(val);
    const u = parseFloat(units);
    const bp = parseFloat(val);
    if (!isNaN(u) && u > 0 && !isNaN(bp) && bp > 0) {
      setInvestedAmountRupees((u * bp).toFixed(2));
    }
  };

  const handleCurrentPriceChange = (val: string) => {
    setCurrentPriceRupees(val);
    const u = parseFloat(units);
    const cp = parseFloat(val);
    if (!isNaN(u) && u > 0 && !isNaN(cp) && cp > 0) {
      setCurrentValuationRupees((u * cp).toFixed(2));
    }
  };

  // Auto-calculate in Edit form
  const handleEditUnitsChange = (val: string) => {
    setEditUnits(val);
    const u = parseFloat(val);
    const bp = parseFloat(editBuyPriceRupees);
    const cp = parseFloat(editCurrentPriceRupees);
    if (!isNaN(u) && u > 0 && !isNaN(bp) && bp > 0) {
      setEditInvestedAmountRupees((u * bp).toFixed(2));
    }
    if (!isNaN(u) && u > 0 && !isNaN(cp) && cp > 0) {
      setEditCurrentValuationRupees((u * cp).toFixed(2));
    }
  };

  const handleEditBuyPriceChange = (val: string) => {
    setEditBuyPriceRupees(val);
    const u = parseFloat(editUnits);
    const bp = parseFloat(val);
    if (!isNaN(u) && u > 0 && !isNaN(bp) && bp > 0) {
      setEditInvestedAmountRupees((u * bp).toFixed(2));
    }
  };

  const handleEditCurrentPriceChange = (val: string) => {
    setEditCurrentPriceRupees(val);
    const u = parseFloat(editUnits);
    const cp = parseFloat(val);
    if (!isNaN(u) && u > 0 && !isNaN(cp) && cp > 0) {
      setEditCurrentValuationRupees((u * cp).toFixed(2));
    }
  };

  const openEditModal = (inv: IInvestment) => {
    setEditingInvestment(inv);
    setEditName(inv.name);
    setEditType(inv.type);
    setEditInvestedAmountRupees((inv.investedAmountInPaise / 100).toString());
    setEditCurrentValuationRupees((inv.currentValueInPaise / 100).toString());
    setEditUnits(inv.units ? inv.units.toString() : '');
    setEditBuyPriceRupees(inv.buyPriceInPaise ? (inv.buyPriceInPaise / 100).toString() : '');
    setEditCurrentPriceRupees(inv.currentPriceInPaise ? (inv.currentPriceInPaise / 100).toString() : '');
    setEditExpectedReturnRate(inv.expectedReturnRate ? inv.expectedReturnRate.toString() : '');
    setEditRiskLevel(inv.riskLevel || 'Moderate Risk');
    setEditNotes(inv.notes || '');
    setFeedback(null);
  };

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFeedback(null);

      const invPaise = Math.round((parseFloat(investedAmountRupees) || 0) * 100);
      if (invPaise <= 0) {
        setFeedback({ type: 'error', message: 'Invested principal must be greater than zero.' });
        return;
      }

      const currPaise = currentValuationRupees
        ? Math.round((parseFloat(currentValuationRupees) || 0) * 100)
        : invPaise;

      const parsedUnits = units ? parseFloat(units) : undefined;
      const parsedBuyPrice = buyPriceRupees ? Math.round(parseFloat(buyPriceRupees) * 100) : undefined;
      const parsedCurrentPrice = currentPriceRupees ? Math.round(parseFloat(currentPriceRupees) * 100) : undefined;

      await api.createInvestment({
        name,
        type,
        investedAmountInPaise: invPaise,
        currentValueInPaise: currPaise,
        units: parsedUnits,
        buyPriceInPaise: parsedBuyPrice,
        currentPriceInPaise: parsedCurrentPrice,
        expectedReturnRate: expectedReturnRate ? parseFloat(expectedReturnRate) : undefined,
        riskLevel,
        sourceAccountId: sourceAccountId || undefined,
        notes
      });

      await refreshAll();
      setIsAddOpen(false);
      setName('');
      setInvestedAmountRupees('');
      setCurrentValuationRupees('');
      setUnits('');
      setBuyPriceRupees('');
      setCurrentPriceRupees('');
      setNotes('');
      setFeedback({ type: 'success', message: `Investment asset "${name}" recorded successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record investment.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestment) return;
    try {
      setLoading(true);
      setFeedback(null);

      const invPaise = Math.round((parseFloat(editInvestedAmountRupees) || 0) * 100);
      const currPaise = Math.round((parseFloat(editCurrentValuationRupees) || 0) * 100);

      if (invPaise < 0 || currPaise < 0) {
        setFeedback({ type: 'error', message: 'Invested principal and valuation cannot be negative.' });
        return;
      }

      const parsedUnits = editUnits ? parseFloat(editUnits) : undefined;
      const parsedBuyPrice = editBuyPriceRupees ? Math.round(parseFloat(editBuyPriceRupees) * 100) : undefined;
      const parsedCurrentPrice = editCurrentPriceRupees ? Math.round(parseFloat(editCurrentPriceRupees) * 100) : undefined;

      await api.updateInvestment(editingInvestment.id, {
        name: editName,
        type: editType,
        investedAmountInPaise: invPaise,
        currentValueInPaise: currPaise,
        units: parsedUnits,
        buyPriceInPaise: parsedBuyPrice,
        currentPriceInPaise: parsedCurrentPrice,
        expectedReturnRate: editExpectedReturnRate ? parseFloat(editExpectedReturnRate) : undefined,
        riskLevel: editRiskLevel,
        notes: editNotes
      });

      await refreshAll();
      setEditingInvestment(null);
      setFeedback({ type: 'success', message: `Investment "${editName}" updated successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update investment.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuickValuation = async (id: string) => {
    try {
      setLoading(true);
      const valPaise = Math.round((parseFloat(quickEditValuationRupees) || 0) * 100);
      if (valPaise < 0) {
        setFeedback({ type: 'error', message: 'Valuation cannot be negative.' });
        return;
      }
      await api.updateInvestmentValuation(id, valPaise);
      await refreshAll();
      setQuickEditingId(null);
      setFeedback({ type: 'success', message: 'Asset market valuation updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update valuation.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestment = async (id: string, assetName: string) => {
    if (confirm(`Delete investment holding "${assetName}"? This operation cannot be undone.`)) {
      try {
        setLoading(true);
        await api.deleteInvestment(id);
        await refreshAll();
        setFeedback({ type: 'success', message: `Investment "${assetName}" removed from portfolio.` });
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed to delete investment.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Investment Portfolio &amp; Wealth Tracking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracks mutual funds, equities, gold, and bonds. Investment contributions are classified as asset allocations, strictly separate from consumption expenses.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Investment</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:opacity-70 text-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Portfolio Totals Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Invested Principal</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalInvestedPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Total capital cost basis</span>
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
          <span className="text-[11px] text-slate-400">Unrealized portfolio gain/loss</span>
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
            No investment holdings recorded. Click "Add Investment" to log mutual funds, equities, or gold.
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
                {investments.map(inv => {
                  const invested = Number(inv.investedAmountInPaise) || 0;
                  const current = Number(inv.currentValueInPaise) || 0;
                  const gain = current - invested;
                  const ret = invested > 0
                    ? ((gain / invested) * 100).toFixed(2)
                    : '0.00';
                  const isQuickEditing = quickEditingId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {inv.name}
                        {inv.units && (
                          <span className="block text-[11px] text-slate-400 font-mono font-normal">
                            {inv.units} units {inv.currentPriceInPaise ? `@ ${formatINR(inv.currentPriceInPaise)}` : ''}
                          </span>
                        )}
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
                        {formatINR(invested)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {isQuickEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="any"
                              value={quickEditValuationRupees}
                              onChange={e => setQuickEditValuationRupees(e.target.value)}
                              className="w-24 px-1.5 py-0.5 border border-blue-500 rounded text-xs font-mono text-right bg-white dark:bg-slate-800"
                            />
                            <button
                              onClick={() => handleSaveQuickValuation(inv.id)}
                              disabled={loading}
                              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-500"
                              title="Save valuation"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setQuickEditingId(null)}
                              className="px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span>{formatINR(current)}</span>
                        )}
                      </td>
                      <td className={`py-3 text-right font-mono font-semibold ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {gain >= 0 ? '+' : ''}{formatINR(gain)} ({gain >= 0 ? '+' : ''}{ret}%)
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(inv)}
                            title="Edit full investment details"
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setQuickEditingId(inv.id);
                              setQuickEditValuationRupees((current / 100).toString());
                            }}
                            title="Quick edit market valuation"
                            className="p-1.5 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvestment(inv.id, inv.name)}
                            title="Delete investment asset"
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

      {/* Edit Investment Modal */}
      {editingInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Edit Investment Asset</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvestment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInvestment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Asset Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Asset Type</label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Risk Tier</label>
                  <select
                    value={editRiskLevel}
                    onChange={e => setEditRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Very Low Risk">Very Low Risk</option>
                    <option value="Low Risk">Low Risk</option>
                    <option value="Moderate Risk">Moderate Risk</option>
                    <option value="High Risk">High Risk</option>
                    <option value="Very High Risk">Very High Risk</option>
                  </select>
                </div>
              </div>

              {/* Units & Pricing fields */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Optional Unit Pricing (Auto-calculates totals)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Units / Quantity</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 50"
                      value={editUnits}
                      onChange={e => handleEditUnitsChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Buy Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={editBuyPriceRupees}
                      onChange={e => handleEditBuyPriceChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Current Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 115"
                      value={editCurrentPriceRupees}
                      onChange={e => handleEditCurrentPriceChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Invested Principal (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editInvestedAmountRupees}
                    onChange={e => setEditInvestedAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Current Valuation (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editCurrentValuationRupees}
                    onChange={e => setEditCurrentValuationRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Return Projection */}
              {(() => {
                const inv = parseFloat(editInvestedAmountRupees) || 0;
                const curr = parseFloat(editCurrentValuationRupees) || 0;
                const diff = curr - inv;
                const ret = inv > 0 ? ((diff / inv) * 100).toFixed(2) : '0.00';
                return (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Projected Return:</span>
                    <span className={`font-mono font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({diff >= 0 ? '+' : ''}{ret}%)
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes &amp; Portfolio Comments</label>
                <input
                  type="text"
                  placeholder="e.g. SIP registered on Zerodha"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvestment(null)}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Update Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Investment Asset</h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvestment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parag Parikh Flexi Cap Fund"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Risk Tier</label>
                  <select
                    value={riskLevel}
                    onChange={e => setRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Very Low Risk">Very Low Risk</option>
                    <option value="Low Risk">Low Risk</option>
                    <option value="Moderate Risk">Moderate Risk</option>
                    <option value="High Risk">High Risk</option>
                    <option value="Very High Risk">Very High Risk</option>
                  </select>
                </div>
              </div>

              {/* Units & Pricing fields */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Optional Unit Pricing (Auto-calculates totals)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Units / Quantity</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 50"
                      value={units}
                      onChange={e => handleUnitsChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Buy Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={buyPriceRupees}
                      onChange={e => handleBuyPriceChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Current Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 115"
                      value={currentPriceRupees}
                      onChange={e => handleCurrentPriceChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Invested Principal (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="5000"
                    value={investedAmountRupees}
                    onChange={e => setInvestedAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Current Valuation (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Leave empty if same"
                    value={currentValuationRupees}
                    onChange={e => setCurrentValuationRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Fund From Bank Account</label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">No bank deduction (already funded or external)</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({formatINR(a.balanceInPaise)})</option>)}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Selecting a bank account records an asset allocation transaction without treating it as an ordinary expense.
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. SIP on 5th of every month"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Record Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
