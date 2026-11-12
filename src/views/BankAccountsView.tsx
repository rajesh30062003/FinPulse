import React, { useState } from 'react';
import { Landmark, Plus, ArrowRightLeft, ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldCheck, Edit3, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../services/api';

export const BankAccountsView: React.FC = () => {
  const { accounts, refreshAll, transactions } = useFinancial();
  const { user } = useAuth();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [accountToClose, setAccountToClose] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Active accounts vs closed accounts
  const activeAccounts = accounts.filter(a => a.isActive !== false && a.status !== 'Closed');
  const closedAccounts = accounts.filter(a => a.isActive === false || a.status === 'Closed');

  // Form states
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user?.name || 'Rajesh Pal');
  const [accountType, setAccountType] = useState<'Savings' | 'Current' | 'Salary' | 'Other'>('Savings');
  const [accountNickname, setAccountNickname] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');

  // Deposit form (only active accounts)
  const [depositBankId, setDepositBankId] = useState(activeAccounts[0]?.id || accounts[0]?.id || '');
  const [depositAmountRupees, setDepositAmountRupees] = useState('');
  const [depositSource, setDepositSource] = useState('Salary');
  const [depositDescription, setDepositDescription] = useState('Salary Credit');

  // Transfer form (only active accounts)
  const [transferFromId, setTransferFromId] = useState(activeAccounts[0]?.id || accounts[0]?.id || '');
  const [transferToId, setTransferToId] = useState(activeAccounts[1]?.id || activeAccounts[0]?.id || accounts[1]?.id || '');
  const [transferAmountRupees, setTransferAmountRupees] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createAccount({
        bankName,
        accountHolderName,
        accountType,
        accountNickname: accountNickname || `${bankName} ${accountType}`,
        accountNumber,
        openingBalanceInPaise: Math.round((parseFloat(openingBalance) || 0) * 100),
        notes
      });
      await refreshAll();
      setIsAddAccountOpen(false);
      setMsg('Bank account registered successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(depositAmountRupees) || 0) * 100);
      await api.createTransaction({
        type: 'income',
        mainCategory: 'Essential',
        subCategory: depositSource,
        amountInPaise: amtPaise,
        paymentMethod: 'Bank Account',
        destinationAccountId: depositBankId,
        description: depositDescription,
        date: new Date().toISOString()
      });
      await refreshAll();
      setIsDepositOpen(false);
      setMsg(`Deposited ${formatINR(amtPaise)} into selected bank account.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromId === transferToId) {
      alert('Source and destination accounts must be different');
      return;
    }
    try {
      setLoading(true);
      const amtPaise = Math.round((parseFloat(transferAmountRupees) || 0) * 100);
      await api.createTransaction({
        type: 'transfer',
        mainCategory: 'Transfer',
        subCategory: 'Bank to Bank Transfer',
        amountInPaise: amtPaise,
        paymentMethod: 'Bank Account',
        sourceAccountId: transferFromId,
        destinationAccountId: transferToId,
        description: 'Inter-bank fund transfer',
        date: new Date().toISOString()
      });
      await refreshAll();
      setIsTransferOpen(false);
      setMsg(`Transferred ${formatINR(amtPaise)} between accounts without altering net wealth.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!accountToClose) return;
    try {
      setIsClosing(true);
      await api.closeAccount(accountToClose.id);
      await refreshAll();
      setMsg(`Account ${accountToClose.bankName} (${accountToClose.accountNumberMasked}) has been closed safely. Transaction history remains preserved.`);
      setAccountToClose(null);
    } catch (err: any) {
      alert(err.message || 'Failed to close account');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenAccount = async (id: string, name: string) => {
    try {
      setLoading(true);
      await api.reopenAccount(id);
      await refreshAll();
      setMsg(`Account ${name} reopened successfully and restored to active balance calculations.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen account');
    } finally {
      setLoading(false);
    }
  };

  const totalBankPaise = activeAccounts.reduce((sum, a) => sum + a.balanceInPaise, 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Bank Account Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain independent balances for each bank account. Inter-bank transfers update balances atomically without creating fake expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDepositOpen(true)}
            disabled={activeAccounts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Deposit / Add Money</span>
          </button>
          <button
            onClick={() => setIsTransferOpen(true)}
            disabled={activeAccounts.length < 2}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Bank Transfer</span>
          </button>
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Bank</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
        </div>
      )}

      {/* Total Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500">Cumulative Liquid Bank Deposits</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatINR(totalBankPaise)}
          </div>
        </div>
        <div className="text-xs text-slate-400 text-right">
          <div><strong className="text-slate-700 dark:text-slate-200">{activeAccounts.length}</strong> active institution{activeAccounts.length !== 1 ? 's' : ''}</div>
          {closedAccounts.length > 0 && (
            <div className="text-[11px] text-slate-400 mt-0.5">({closedAccounts.length} closed account{closedAccounts.length !== 1 ? 's' : ''})</div>
          )}
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const isClosed = acc.isActive === false || acc.status === 'Closed';
          const accTxs = transactions.filter(t => t.sourceAccountId === acc.id || t.destinationAccountId === acc.id);
          const depositsPaise = accTxs
            .filter(t => t.destinationAccountId === acc.id)
            .reduce((sum, t) => sum + t.amountInPaise, 0);
          const withdrawalsPaise = accTxs
            .filter(t => t.sourceAccountId === acc.id)
            .reduce((sum, t) => sum + t.amountInPaise, 0);

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-xl border shadow-xs space-y-4 transition-all ${
                isClosed
                  ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{acc.bankName}</h3>
                    {isClosed ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        Closed
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{acc.accountNickname} · {acc.accountType}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{acc.accountNumberMasked}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400">{isClosed ? 'Closing Balance' : 'Current Cleared Balance'}</span>
                <div className={`text-2xl font-bold font-mono ${isClosed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                  {formatINR(acc.balanceInPaise)}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Total Deposits:</span>
                  <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    +{formatINR(depositsPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Total Outflows:</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                    -{formatINR(withdrawalsPaise)}
                  </div>
                </div>
              </div>

              {acc.notes && (
                <p className="text-[11px] text-slate-400 italic">{acc.notes}</p>
              )}

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {!isClosed ? (
                  <button
                    type="button"
                    onClick={() => setAccountToClose(acc)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Close Account</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] text-slate-400 italic">History preserved</span>
                    <button
                      type="button"
                      onClick={() => handleReopenAccount(acc.id, acc.bankName)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reopen Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Account Confirmation Modal */}
      {accountToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Account Closure</h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to close <strong>{accountToClose.bankName}</strong> (<span className="font-mono">{accountToClose.accountNumberMasked}</span>)?
            </p>

            {accountToClose.balanceInPaise > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Active Balance Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This account currently holds <strong>{formatINR(accountToClose.balanceInPaise)}</strong>. Closing it will exclude this balance from your active liquid wealth. All historical transactions will remain completely preserved for reporting.
                </p>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              ℹ️ Existing transaction records and statements linked to this account will <strong>not</strong> be deleted.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={isClosing}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isClosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isClosing ? 'Closing Account...' : 'Confirm Close Account'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountToClose(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add New Bank Account</h2>
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICICI Bank, Axis Bank"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Savings"
                  value={accountNickname}
                  onChange={e => setAccountNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={e => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="Salary">Salary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="7890"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Save Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Deposit / Add Money into Bank</h2>
            <form onSubmit={handleDeposit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Select Bank Account</label>
                <select
                  value={depositBankId}
                  onChange={e => setDepositBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} - {a.accountNickname}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Deposit Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 40000"
                  value={depositAmountRupees}
                  onChange={e => setDepositAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Income Source</label>
                <select
                  value={depositSource}
                  onChange={e => setDepositSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Salary">Salary</option>
                  <option value="Freelancing">Freelancing</option>
                  <option value="Business income">Business income</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Interest">Interest</option>
                  <option value="Other income">Other income</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={depositDescription}
                  onChange={e => setDepositDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Record Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inter-Bank Fund Transfer</h2>
            <p className="text-xs text-slate-500">Decreases source bank and increases target bank. Net wealth remains unchanged.</p>
            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">From Bank Account</label>
                <select
                  value={transferFromId}
                  onChange={e => setTransferFromId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} ({formatINR(a.balanceInPaise)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">To Bank Account</label>
                <select
                  value={transferToId}
                  onChange={e => setTransferToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} ({formatINR(a.balanceInPaise)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Transfer Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={transferAmountRupees}
                  onChange={e => setTransferAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Execute Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
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
