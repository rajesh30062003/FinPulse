import React, { useState } from 'react';
import { CreditCard, Plus, CheckCircle2, ShieldCheck, AlertCircle, ArrowUpRight, RotateCcw, Trash2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';
import { ICreditCard } from '../types';

export const CreditCardsView: React.FC = () => {
  const { creditCards, refreshAll, setIsPayBillOpen, setSelectedCardForBill } = useFinancial();

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardToClose, setCardToClose] = useState<ICreditCard | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNickname, setCardNickname] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [creditLimitRupees, setCreditLimitRupees] = useState('');
  const [statementDay, setStatementDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [billingCycle, setBillingCycle] = useState('16th to 15th');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createCreditCard({
        cardName,
        bankName,
        cardNickname: cardNickname || cardName,
        lastFourDigits,
        creditLimitInPaise: Math.round((parseFloat(creditLimitRupees) || 0) * 100),
        statementDay: parseInt(statementDay, 10),
        dueDay: parseInt(dueDay, 10),
        billingCycle,
        notes
      });
      await refreshAll();
      setIsAddCardOpen(false);
      setMsg('Credit card registered successfully with active limit tracking.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!cardToClose) return;
    try {
      setIsClosing(true);
      await api.closeCreditCard(cardToClose.id);
      await refreshAll();
      setCardToClose(null);
      setMsg(`Card ${cardToClose.cardName} (•••• ${cardToClose.lastFourDigits}) has been closed. New expenses are blocked.`);
    } catch (err: any) {
      alert(err.message || 'Failed to close credit card');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenCard = async (card: ICreditCard) => {
    try {
      setLoading(true);
      await api.reopenCreditCard(card.id);
      await refreshAll();
      setMsg(`Card ${card.cardName} (•••• ${card.lastFourDigits}) has been reactivated.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen credit card');
    } finally {
      setLoading(false);
    }
  };

  const activeCards = creditCards.filter(c => c.isActive !== false && c.status !== 'Closed');
  const closedCards = creditCards.filter(c => c.isActive === false || c.status === 'Closed');

  const totalOutstandingPaise = creditCards.reduce((sum, c) => sum + c.outstandingBalanceInPaise, 0);
  const totalLimitPaise = activeCards.reduce((sum, c) => sum + c.creditLimitInPaise, 0);
  const totalAvailablePaise = activeCards.reduce((sum, c) => sum + Math.max(0, c.availableCreditInPaise), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            Credit Card Portfolio &amp; Liability Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracks available credit limits, statement dates, and outstanding debt without double-deducting bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPayBillOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pay Card Bill</span>
          </button>
          <button
            onClick={() => setIsAddCardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Card</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Credit Card Outstanding</span>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {formatINR(totalOutstandingPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Current liability to be settled across all cards</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Available Credit Balance</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalAvailablePaise)}
          </div>
          <span className="text-[11px] text-slate-400">Headroom across {activeCards.length} active card{activeCards.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Sanctioned Active Limit</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalLimitPaise)}
          </div>
          <span className="text-[11px] text-slate-400">
            {activeCards.length} active {closedCards.length > 0 ? `(${closedCards.length} closed)` : ''}
          </span>
        </div>
      </div>

      {/* Card List - Active */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Credit Cards ({activeCards.length})
          </h2>
        </div>

        {activeCards.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No active credit cards registered.</p>
            <p className="text-[11px] text-slate-400">Register a new card above to start tracking credit limits and bills.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCards.map(card => {
              const utilization = card.creditLimitInPaise > 0
                ? Math.round((card.outstandingBalanceInPaise / card.creditLimitInPaise) * 100)
                : 0;

              return (
                <div
                  key={card.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-red-300 dark:hover:border-red-900 transition-colors"
                >
                  {/* Card visual mockup top */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{card.bankName}</span>
                        <span className="font-bold text-sm tracking-tight">{card.cardName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="font-mono text-sm tracking-widest text-slate-300">•••• •••• •••• {card.lastFourDigits}</span>
                      <span className="text-[10px] text-amber-400 font-mono">Due: {card.dueDay}th</span>
                    </div>
                  </div>

                  {/* Outstanding & Available figures */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px]">Outstanding:</span>
                      <div className="font-mono font-bold text-base text-red-600 dark:text-red-400">
                        {formatINR(card.outstandingBalanceInPaise)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Available Credit:</span>
                      <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                        {formatINR(card.availableCreditInPaise)}
                      </div>
                    </div>
                  </div>

                  {/* Utilization progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Limit Utilization:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{utilization}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${utilization > 30 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <div>Billing Cycle: {card.billingCycle} (Statement Day: {card.statementDay}th)</div>
                    {card.lastPaymentDate && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Last Settled: {formatINR(card.lastPaymentAmountInPaise || 0)} on {new Date(card.lastPaymentDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedCardForBill(card);
                        setIsPayBillOpen(true);
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Settle Bill</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardToClose(card)}
                      title="Close this card"
                      className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed Cards Section */}
      {closedCards.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Closed &amp; Deactivated Cards ({closedCards.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              New transactions blocked. Historical records and unsettled liabilities preserved.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {closedCards.map(card => (
              <div
                key={card.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 opacity-90 space-y-4"
              >
                {/* Visual Header */}
                <div className="p-4 rounded-xl bg-slate-800 text-slate-300 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{card.bankName}</span>
                      <span className="font-bold text-sm tracking-tight line-through text-slate-400">{card.cardName}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                      Closed
                    </span>
                  </div>
                  <div className="font-mono text-xs tracking-widest text-slate-400">
                    •••• •••• •••• {card.lastFourDigits}
                  </div>
                </div>

                {card.outstandingBalanceInPaise > 0 ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Outstanding liability: <strong>{formatINR(card.outstandingBalanceInPaise)}</strong>. You can settle this balance below.
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    All liabilities settled (Balance: ₹0.00). Card is closed.
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {card.outstandingBalanceInPaise > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCardForBill(card);
                        setIsPayBillOpen(true);
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Pay Remaining Bill</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleReopenCard(card)}
                    className="flex-1 py-2 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Register Credit Card</h2>
            <form onSubmit={handleCreateCard} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Card Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Regalia Gold, ICICI Coral"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Issuing Bank</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI Card"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="9182"
                    value={lastFourDigits}
                    onChange={e => setLastFourDigits(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={creditLimitRupees}
                    onChange={e => setCreditLimitRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Statement Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={statementDay}
                    onChange={e => setStatementDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Due Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Register Card
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Card Confirmation Modal */}
      {cardToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Close Credit Card</h2>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Card Name:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cardToClose.cardName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issuing Bank:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cardToClose.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Card Number:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">•••• •••• •••• {cardToClose.lastFourDigits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Limit:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatINR(cardToClose.creditLimitInPaise)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                <span className="text-slate-500">Outstanding Debt:</span>
                <span className={`font-mono font-bold ${cardToClose.outstandingBalanceInPaise > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatINR(cardToClose.outstandingBalanceInPaise)}
                </span>
              </div>
            </div>

            {cardToClose.outstandingBalanceInPaise > 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Outstanding Balance Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This card has an unsettled balance of <strong>{formatINR(cardToClose.outstandingBalanceInPaise)}</strong>.
                  Closing it will block all new expense transactions, but bill settlement remains enabled until the outstanding balance is zeroed.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Closing this credit card will remove its sanctioned limit from your active credit headroom and block new expense entries. All historical statements and payment records are preserved.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCardToClose(null)}
                disabled={isClosing}
                className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={isClosing}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isClosing ? 'Closing Card...' : 'Confirm Close Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Register Credit Card</h2>
            <form onSubmit={handleCreateCard} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Card Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Regalia Gold, ICICI Coral"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Issuing Bank</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI Card"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="9182"
                    value={lastFourDigits}
                    onChange={e => setLastFourDigits(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={creditLimitRupees}
                    onChange={e => setCreditLimitRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Statement Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={statementDay}
                    onChange={e => setStatementDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Due Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Register Card
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
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
