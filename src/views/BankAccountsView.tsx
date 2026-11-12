import React, { useState } from 'react';
import { Landmark, Plus, ArrowRightLeft, ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldCheck, Edit3 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../services/api';

export const BankAccountsView: React.FC = () => {
  const { accounts, refreshAll, transactions } = useFinancial();
  const { user } = useAuth();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Form states
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user?.name || 'Rajesh Pal');
  const [accountType, setAccountType] = useState<'Savings' | 'Current' | 'Salary' | 'Other'>('Savings');
  const [accountNickname, setAccountNickname] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');

  // Deposit form
  const [depositBankId, setDepositBankId] = useState(accounts[0]?.id || '');
  const [depositAmountRupees, setDepositAmountRupees] = useState('');
  const [depositSource, setDepositSource] = useState('Salary');
  const [depositDescription, setDepositDescription] = useState('Salary Credit');

  // Transfer form
  const [transferFromId, setTransferFromId] = useState(accounts[0]?.id || '');
  const [transferToId, setTransferToId] = useState(accounts[1]?.id || accounts[0]?.id || '');
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

  const totalBankPaise = accounts.reduce((sum, a) => sum + a.balanceInPaise, 0);

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
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Deposit / Add Money</span>
          </button>
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Bank Transfer</span>
          </button>
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Bank</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
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
        <div className="text-xs text-slate-400">
          {accounts.length} active institutions linked
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          // Account-specific transactions
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
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{acc.bankName}</h3>
                  <p className="text-xs text-slate-500">{acc.accountNickname} · {acc.accountType}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{acc.accountNumberMasked}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400">Current Cleared Balance</span>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
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
            </div>
          );
        })}
      </div>

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
