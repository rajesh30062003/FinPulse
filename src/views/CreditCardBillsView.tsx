import React from 'react';
import { FileCheck2, ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { formatINR } from '../services/api';

export const CreditCardBillsView: React.FC = () => {
  const { creditCards, transactions, setIsPayBillOpen, setSelectedCardForBill } = useFinancial();

  // Find all bill settlement transactions
  const billPaymentTxs = transactions.filter(t => t.type === 'credit_card_payment');

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            Credit Card Bill Settlement & Statements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            CRITICAL RULE: Paying credit card bills settles existing debt liabilities. It is NEVER counted as a duplicate monthly expense.
          </p>
        </div>

        <button
          onClick={() => {
            const cardWithDebt = creditCards.find(c => c.outstandingBalanceInPaise > 0) || creditCards[0];
            if (cardWithDebt) setSelectedCardForBill(cardWithDebt);
            setIsPayBillOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Pay Bill Now</span>
        </button>
      </div>

      {/* Bill Status Cards per Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {creditCards.map(card => {
          const isPaid = card.outstandingBalanceInPaise === 0;
          const minDuePaise = Math.round(card.outstandingBalanceInPaise * 0.05); // 5% minimum

          return (
            <div
              key={card.id}
              className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs space-y-4 ${
                isPaid
                  ? 'border-emerald-200 dark:border-emerald-900/60'
                  : 'border-amber-200 dark:border-amber-900/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">{card.bankName}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{card.cardName}</h3>
                  <span className="text-xs font-mono text-slate-400">•••• •••• •••• {card.lastFourDigits}</span>
                </div>

                <div className="text-right">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid · ₹0 Outstanding
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Bill Pending Settlement
                    </span>
                  )}
                </div>
              </div>

              {/* Outstanding metrics */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400">Total Outstanding:</span>
                  <div className="font-mono font-bold text-sm text-red-600 dark:text-red-400 mt-0.5">
                    {formatINR(card.outstandingBalanceInPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Min Amount Due (5%):</span>
                  <div className="font-mono font-semibold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatINR(minDuePaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Due Date:</span>
                  <div className="font-mono font-semibold text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                    {card.dueDay}th of month
                  </div>
                </div>
              </div>

              {/* Previous Payment Note */}
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {card.lastPaymentDate
                    ? `Last settlement: ${formatINR(card.lastPaymentAmountInPaise || 0)} on ${new Date(card.lastPaymentDate).toLocaleDateString()}`
                    : 'No previous bill settlements recorded yet'}
                </span>
                <span className="text-slate-400">Auto reminder on 25th</span>
              </div>

              {!isPaid && (
                <button
                  onClick={() => {
                    setSelectedCardForBill(card);
                    setIsPayBillOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Settle Outstanding Balance</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment History Ledger */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Credit Card Settlement History</h3>

        {billPaymentTxs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No bill payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Settlement Date</th>
                  <th className="pb-2 font-medium">Card Paid</th>
                  <th className="pb-2 font-medium">Deducted From</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Settled Amount</th>
                  <th className="pb-2 font-medium text-center">Ledger Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {billPaymentTxs.map(t => {
                  const card = creditCards.find(c => c.id === t.creditCardId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-400">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {card ? `${card.cardName} (•••• ${card.lastFourDigits})` : 'Credit Card'}
                      </td>
                      <td className="py-2.5 text-slate-500 font-medium">
                        Bank Transfer
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        {t.description}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(t.amountInPaise)}
                      </td>
                      <td className="py-2.5 text-center text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Liability Settled (0 Duplicate Expense)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
