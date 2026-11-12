import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api, formatINR } from '../services/api';

export const CreditCardBillModal: React.FC = () => {
  const {
    isPayBillOpen,
    setIsPayBillOpen,
    selectedCardForBill,
    creditCards,
    accounts,
    refreshAll
  } = useFinancial();

  const [cardId, setCardId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');
  const eligibleCards = creditCards.filter(c => (c.isActive !== false && c.status !== 'Closed') || c.outstandingBalanceInPaise > 0);

  useEffect(() => {
    if (selectedCardForBill) {
      setCardId(selectedCardForBill.id);
      setPaymentAmountRupees((selectedCardForBill.outstandingBalanceInPaise / 100).toFixed(2));
    } else if (eligibleCards.length > 0) {
      const firstCardWithOutstanding = eligibleCards.find(c => c.outstandingBalanceInPaise > 0) || eligibleCards[0];
      setCardId(firstCardWithOutstanding.id);
      setPaymentAmountRupees((firstCardWithOutstanding.outstandingBalanceInPaise / 100).toFixed(2));
    }

    if (activeAccounts.length > 0 && (!sourceAccountId || !activeAccounts.some(a => a.id === sourceAccountId))) {
      setSourceAccountId(activeAccounts[0].id);
    }
  }, [selectedCardForBill, creditCards, accounts, isPayBillOpen]);

  if (!isPayBillOpen) return null;

  const currentCard = creditCards.find(c => c.id === cardId);
  const selectedBank = accounts.find(a => a.id === sourceAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(paymentAmountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please enter a valid payment amount greater than zero');
      return;
    }
    const paymentAmountInPaise = Math.round(parsedRupees * 100);

    if (currentCard && paymentAmountInPaise > currentCard.outstandingBalanceInPaise) {
      setError(`Payment cannot exceed current outstanding balance of ${formatINR(currentCard.outstandingBalanceInPaise)}`);
      return;
    }

    if (!selectedBank || selectedBank.isActive === false || selectedBank.status === 'Closed') {
      setError('Please select an active paying bank account');
      return;
    }

    if (selectedBank.balanceInPaise < paymentAmountInPaise) {
      setError(`Insufficient bank balance. ${selectedBank.bankName} balance is ${formatINR(selectedBank.balanceInPaise)}`);
      return;
    }

    try {
      setLoading(true);
      await api.payCreditCardBill({
        creditCardId: cardId,
        sourceAccountId,
        paymentAmountInPaise,
        notes: notes || 'Settlement of card liability'
      });

      await refreshAll();
      setIsPayBillOpen(false);
    } catch (err: any) {
      setError(err.message || 'Bill payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    if (currentCard) {
      setPaymentAmountRupees((currentCard.outstandingBalanceInPaise / 100).toFixed(2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Credit Card Bill Settlement
          </h2>
          <button
            onClick={() => setIsPayBillOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice of zero double-counting */}
        <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            FinPulse Ledger Protection: Bill payment reduces card liability and bank balance without creating a duplicate monthly expense.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Credit Card Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Select Credit Card
            </label>
            {eligibleCards.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
                No credit cards with outstanding balances or active limits found.
              </div>
            ) : (
              <select
                value={cardId}
                onChange={e => {
                  setCardId(e.target.value);
                  const c = creditCards.find(item => item.id === e.target.value);
                  if (c) setPaymentAmountRupees((c.outstandingBalanceInPaise / 100).toFixed(2));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {eligibleCards.map(c => {
                  const isClosed = c.isActive === false || c.status === 'Closed';
                  return (
                    <option key={c.id} value={c.id}>
                      {c.cardName} (•••• {c.lastFourDigits}) {isClosed ? '[Closed Card] ' : ''}- Outstanding: {formatINR(c.outstandingBalanceInPaise)}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Card Status Snapshot */}
          {currentCard && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Current Outstanding:</span>
                <div className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                  {formatINR(currentCard.outstandingBalanceInPaise)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Available Credit:</span>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(currentCard.availableCreditInPaise)}
                </div>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Payment Amount (₹)
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Pay Full Outstanding
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmountRupees}
              onChange={e => setPaymentAmountRupees(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Source Bank Account */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Pay From Bank Account
            </label>
            {activeAccounts.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                No active bank accounts available to fund payment. Please add or reopen a bank account.
              </div>
            ) : (
              <select
                value={sourceAccountId}
                onChange={e => setSourceAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} - {a.accountNickname} (Available: {formatINR(a.balanceInPaise)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reference Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Transaction Reference / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Net banking reference #89421"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || activeAccounts.length === 0}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {loading ? 'Processing Settlement...' : 'Confirm Bill Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};
      </div>
    </div>
  );
};
