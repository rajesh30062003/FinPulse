import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ArrowRightLeft, CreditCard, Wallet, Landmark } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../services/api';
import { TransactionType, MainCategory, PaymentMethodType } from '../types';

export const AddTransactionModal: React.FC = () => {
  const {
    isAddTxOpen,
    setIsAddTxOpen,
    addTxDefaultType,
    accounts,
    creditCards,
    refreshAll
  } = useFinancial();

  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');
  const activeCards = creditCards.filter(c => c.isActive !== false && c.status !== 'Closed');

  const [mode, setMode] = useState<'expense' | 'income' | 'transfer'>(
    addTxDefaultType === 'income' ? 'income' : 'expense'
  );
  const [mainCategory, setMainCategory] = useState<MainCategory>('Essential');
  const [subCategory, setSubCategory] = useState<string>('Food');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Bank Account');
  const [sourceAccountId, setSourceAccountId] = useState(activeAccounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(activeAccounts[1]?.id || activeAccounts[0]?.id || '');
  const [creditCardId, setCreditCardId] = useState(activeCards[0]?.id || '');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeSource, setIncomeSource] = useState('Salary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize creditCardId when creditCards load or update
  useEffect(() => {
    if (activeCards.length > 0) {
      if (!creditCardId || !activeCards.some(c => c.id === creditCardId)) {
        setCreditCardId(activeCards[0].id);
      }
    } else {
      setCreditCardId('');
    }
  }, [activeCards, creditCardId]);

  // Synchronize bank accounts when accounts load or update
  useEffect(() => {
    if (activeAccounts.length > 0) {
      if (!sourceAccountId || !activeAccounts.some(a => a.id === sourceAccountId)) {
        setSourceAccountId(activeAccounts[0].id);
      }
      if (!destinationAccountId || !activeAccounts.some(a => a.id === destinationAccountId)) {
        const otherAccount = activeAccounts.find(a => a.id !== sourceAccountId) || activeAccounts[1] || activeAccounts[0];
        setDestinationAccountId(otherAccount.id);
      }
    } else {
      setSourceAccountId('');
      setDestinationAccountId('');
    }
  }, [activeAccounts, sourceAccountId, destinationAccountId]);

  // Reset modal state when opened
  useEffect(() => {
    if (isAddTxOpen) {
      setError(null);
      setLoading(false);
      setMode(addTxDefaultType === 'income' ? 'income' : 'expense');
      if (activeCards.length > 0 && (!creditCardId || !activeCards.some(c => c.id === creditCardId))) {
        setCreditCardId(activeCards[0].id);
      }
      if (activeAccounts.length > 0 && (!sourceAccountId || !activeAccounts.some(a => a.id === sourceAccountId))) {
        setSourceAccountId(activeAccounts[0].id);
      }
    }
  }, [isAddTxOpen, addTxDefaultType]);

  if (!isAddTxOpen) return null;

  const essentialSubs = [
    'Food', 'Clothing', 'Travel', 'Rent', 'Family', 'Gifts',
    'Mobile Recharge', 'Internet', 'Electricity', 'Medical',
    'Education', 'Groceries', 'Household', 'Personal Care', 'Other'
  ];

  const funSubs = [
    'Entertainment', 'Movies', 'Restaurants', 'Shopping',
    'Gaming', 'Trips', 'Hobbies', 'Eating Outside', 'Other'
  ];

  const investmentSubs = [
    'Fixed Deposit', 'Recurring Deposit', 'Mutual Funds',
    'Stocks', 'Gold', 'Bonds', 'Other Investments', 'Other'
  ];

  const incomeSources = [
    'Salary', 'Freelancing', 'Business income', 'Interest',
    'Bonus', 'Gift received', 'Other income'
  ];

  const activeSubcategories =
    mainCategory === 'Essential'
      ? essentialSubs
      : mainCategory === 'Fun'
      ? funSubs
      : mainCategory === 'Investment'
      ? investmentSubs
      : ['General', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    const amountInPaise = Math.round(parsedRupees * 100);

    let txType: TransactionType = 'expense';
    let finalMainCategory = mainCategory;
    let finalSubCategory = subCategory;

    if (mode === 'income') {
      txType = 'income';
      finalMainCategory = 'Essential';
      finalSubCategory = incomeSource;
      if (!sourceAccountId || !activeAccounts.some(a => a.id === sourceAccountId)) {
        setError('Please select an active receiving bank account');
        return;
      }
    } else if (mode === 'transfer') {
      txType = 'transfer';
      finalMainCategory = 'Transfer';
      finalSubCategory = 'Bank to Bank Transfer';
      if (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId) {
        setError('Select two different active bank accounts for transfer');
        return;
      }
    } else {
      // Expense mode
      if (paymentMethod === 'Credit Card') {
        txType = 'credit_card_expense';
        if (!creditCardId || !activeCards.some(c => c.id === creditCardId)) {
          setError('Please select an active credit card');
          return;
        }
      } else if (paymentMethod === 'Bank Account') {
        txType = 'expense';
        if (!sourceAccountId || !activeAccounts.some(a => a.id === sourceAccountId)) {
          setError('Please select an active source bank account');
          return;
        }
      } else {
        // Cash payment
        txType = 'expense';
      }
    }

    try {
      setLoading(true);
      await api.createTransaction({
        type: txType,
        mainCategory: finalMainCategory,
        subCategory: subCategory === 'Other' && customSubCategory ? customSubCategory : finalSubCategory,
        customSubCategory: subCategory === 'Other' ? customSubCategory : undefined,
        amountInPaise,
        paymentMethod: mode === 'transfer' ? 'Bank Account' : paymentMethod,
        sourceAccountId: mode === 'income' ? undefined : (paymentMethod === 'Bank Account' || mode === 'transfer' ? sourceAccountId : undefined),
        destinationAccountId: mode === 'income' ? sourceAccountId : (mode === 'transfer' ? destinationAccountId : undefined),
        creditCardId: paymentMethod === 'Credit Card' ? creditCardId : undefined,
        description: description || `${finalSubCategory} ${mode}`,
        notes,
        date: new Date(date).toISOString()
      });

      await refreshAll();
      setIsAddTxOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Transaction</h2>
          <button
            onClick={() => setIsAddTxOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode('expense'); setPaymentMethod('Bank Account'); }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setMode('income'); setPaymentMethod('Bank Account'); }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'income'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => { setMode('transfer'); setPaymentMethod('Bank Account'); }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'transfer'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Transfer
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-3 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amountRupees}
                onChange={e => setAmountRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* INCOME MODE SPECIFIC FIELDS */}
          {mode === 'income' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Income Source
                </label>
                <select
                  value={incomeSource}
                  onChange={e => setIncomeSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {incomeSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Receiving Bank Account
                </label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.accountNickname} (₹{(a.balanceInPaise / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TRANSFER MODE SPECIFIC FIELDS */}
          {mode === 'transfer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  From Bank Account
                </label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} (₹{(a.balanceInPaise / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  To Bank Account
                </label>
                <select
                  value={destinationAccountId}
                  onChange={e => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} (₹{(a.balanceInPaise / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* EXPENSE MODE SPECIFIC FIELDS */}
          {mode === 'expense' && (
            <>
              {/* Category Trio */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Spending Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Essential', 'Fun', 'Investment'] as MainCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setMainCategory(cat);
                        setSubCategory(cat === 'Essential' ? 'Food' : cat === 'Fun' ? 'Entertainment' : 'Mutual Funds');
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                        mainCategory === cat
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {activeSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {subCategory === 'Other' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Custom Category Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pet Care, Books"
                      value={customSubCategory}
                      onChange={e => setCustomSubCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  How Did You Pay?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Bank Account');
                      if (!sourceAccountId && accounts.length > 0) {
                        setSourceAccountId(accounts[0].id);
                      }
                      setError(null);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      paymentMethod === 'Bank Account'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank / Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Credit Card');
                      if (creditCards.length > 0 && (!creditCardId || !creditCards.some(c => c.id === creditCardId))) {
                        setCreditCardId(creditCards[0].id);
                      }
                      setError(null);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      paymentMethod === 'Credit Card'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Credit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Cash');
                      setError(null);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                </div>
              </div>

              {/* Account/Card Dropdown */}
              {paymentMethod === 'Bank Account' && (
                <div>
                  <label htmlFor="payingBankAccountSelect" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Paying Bank Account
                  </label>
                  {activeAccounts.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                      No active bank accounts available. Please add or reopen a bank account first.
                    </div>
                  ) : (
                    <select
                      id="payingBankAccountSelect"
                      value={sourceAccountId}
                      onChange={e => {
                        const val = e.target.value;
                        setSourceAccountId(val);
                        if (val) setError(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {activeAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.bankName} - {a.accountNickname} (₹{(a.balanceInPaise / 100).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {paymentMethod === 'Credit Card' && (
                <div>
                  <label htmlFor="creditCardSelect" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Select Credit Card (Will increase card outstanding)
                  </label>
                  {activeCards.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                      No active credit cards available. Please register or reopen a credit card first.
                    </div>
                  ) : (
                    <select
                      id="creditCardSelect"
                      value={creditCardId}
                      onChange={e => {
                        const val = e.target.value;
                        setCreditCardId(val);
                        if (val) setError(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {activeCards.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.cardName} (•••• {c.lastFourDigits}) - Avail: ₹{(c.availableCreditInPaise / 100).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </>
          )}

          {/* Description & Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Weekly grocery shopping, Client payment"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Receipt reference, tags, or invoice note"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs transition-colors"
            >
              {loading ? 'Recording in Ledger...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
