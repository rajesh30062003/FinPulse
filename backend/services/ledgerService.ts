import { getDb, saveDatabase } from '../db.js';
import { ITransaction, IBankAccount, ICreditCard, ICashWallet } from '../types.js';

export class LedgerService {
  /**
   * Reverses the financial impact of a transaction before deletion or update
   */
  static reverseTransaction(tx: ITransaction) {
    const db = getDb();
    const { type, amountInPaise, sourceAccountId, destinationAccountId, creditCardId, paymentMethod } = tx;

    switch (type) {
      case 'income':
        if (destinationAccountId) {
          const bank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        break;

      case 'expense':
        if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        } else if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;

      case 'credit_card_expense':
        if (creditCardId) {
          const card = db.creditCards.find(c => c.id === creditCardId);
          if (card) {
            card.outstandingBalanceInPaise = Math.max(0, card.outstandingBalanceInPaise - amountInPaise);
            card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
          }
        }
        break;

      case 'credit_card_payment':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise; // restore bank balance
        }
        if (creditCardId) {
          const card = db.creditCards.find(c => c.id === creditCardId);
          if (card) {
            card.outstandingBalanceInPaise += amountInPaise; // restore debt
            card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
          }
        }
        break;

      case 'transfer':
        if (sourceAccountId) {
          const srcBank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (srcBank) srcBank.balanceInPaise += amountInPaise;
        }
        if (destinationAccountId) {
          const destBank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (destBank) destBank.balanceInPaise -= amountInPaise;
        }
        break;

      case 'cash_withdrawal':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        const cashWithdrawal = db.cashWallets.find(w => w.userId === tx.userId);
        if (cashWithdrawal) cashWithdrawal.balanceInPaise -= amountInPaise;
        break;

      case 'cash_deposit':
        const cashDeposit = db.cashWallets.find(w => w.userId === tx.userId);
        if (cashDeposit) cashDeposit.balanceInPaise += amountInPaise;
        if (destinationAccountId) {
          const bank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        }
        break;

      case 'emergency_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        }
        const ef = db.emergencyFunds.find(e => e.userId === tx.userId);
        if (ef) ef.currentBalanceInPaise = Math.max(0, ef.currentBalanceInPaise - amountInPaise);
        break;

      case 'emergency_withdrawal':
        if (destinationAccountId) {
          const bank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        }
        const efWithdraw = db.emergencyFunds.find(e => e.userId === tx.userId);
        if (efWithdraw) efWithdraw.currentBalanceInPaise += amountInPaise;
        break;

      case 'investment_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        }
        break;

      case 'savings_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;
    }
  }

  /**
   * Applies the financial impact of a new transaction atomically
   */
  static applyTransaction(tx: ITransaction) {
    const db = getDb();
    const { type, amountInPaise, sourceAccountId, destinationAccountId, creditCardId, paymentMethod } = tx;

    switch (type) {
      case 'income':
        if (destinationAccountId) {
          const bank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (!bank) throw new Error('Receiving bank account not found');
          bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === 'Cash') {
          let cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (!cash) {
            cash = { id: `cash-${Date.now()}`, userId: tx.userId, balanceInPaise: 0, updatedAt: new Date().toISOString() };
            db.cashWallets.push(cash);
          }
          cash.balanceInPaise += amountInPaise;
        }
        break;

      case 'expense':
        if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (!cash || cash.balanceInPaise < amountInPaise) {
            // Allow transaction but warn or handle low balance
          }
          if (cash) cash.balanceInPaise -= amountInPaise;
        } else if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (!bank) throw new Error('Source bank account not found');
          bank.balanceInPaise -= amountInPaise;
        }
        break;

      case 'credit_card_expense':
        if (!creditCardId) throw new Error('Credit card must be specified for credit card expense');
        const card = db.creditCards.find(c => c.id === creditCardId);
        if (!card) throw new Error('Credit card not found');
        card.outstandingBalanceInPaise += amountInPaise;
        card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
        // Bank balance remains untouched!
        break;

      case 'credit_card_payment':
        if (!creditCardId) throw new Error('Credit card required for bill payment');
        if (!sourceAccountId) throw new Error('Source bank account required for bill payment');

        const payBank = db.bankAccounts.find(b => b.id === sourceAccountId);
        if (!payBank) throw new Error('Source bank account not found');
        const payCard = db.creditCards.find(c => c.id === creditCardId);
        if (!payCard) throw new Error('Credit card not found');

        // Deduct from paying bank
        payBank.balanceInPaise -= amountInPaise;
        // Deduct outstanding from card
        payCard.outstandingBalanceInPaise = Math.max(0, payCard.outstandingBalanceInPaise - amountInPaise);
        payCard.availableCreditInPaise = payCard.creditLimitInPaise - payCard.outstandingBalanceInPaise;
        payCard.lastPaymentDate = tx.date;
        payCard.lastPaymentAmountInPaise = amountInPaise;
        break;

      case 'transfer':
        if (!sourceAccountId || !destinationAccountId) {
          throw new Error('Both source and destination accounts are required for transfer');
        }
        if (sourceAccountId === destinationAccountId) {
          throw new Error('Cannot transfer to the same account');
        }
        const srcBank = db.bankAccounts.find(b => b.id === sourceAccountId);
        const destBank = db.bankAccounts.find(b => b.id === destinationAccountId);
        if (!srcBank || !destBank) throw new Error('Bank accounts for transfer not found');

        srcBank.balanceInPaise -= amountInPaise;
        destBank.balanceInPaise += amountInPaise;
        break;

      case 'cash_withdrawal':
        if (!sourceAccountId) throw new Error('Source bank account required for cash withdrawal');
        const withdrawBank = db.bankAccounts.find(b => b.id === sourceAccountId);
        if (!withdrawBank) throw new Error('Source bank account not found');
        let cashW = db.cashWallets.find(w => w.userId === tx.userId);
        if (!cashW) {
          cashW = { id: `cash-${Date.now()}`, userId: tx.userId, balanceInPaise: 0, updatedAt: new Date().toISOString() };
          db.cashWallets.push(cashW);
        }
        withdrawBank.balanceInPaise -= amountInPaise;
        cashW.balanceInPaise += amountInPaise;
        break;

      case 'cash_deposit':
        if (!destinationAccountId) throw new Error('Destination bank account required for cash deposit');
        const depositBank = db.bankAccounts.find(b => b.id === destinationAccountId);
        if (!depositBank) throw new Error('Destination bank account not found');
        const cashD = db.cashWallets.find(w => w.userId === tx.userId);
        if (cashD) cashD.balanceInPaise -= amountInPaise;
        depositBank.balanceInPaise += amountInPaise;
        break;

      case 'emergency_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        let ef = db.emergencyFunds.find(e => e.userId === tx.userId);
        if (!ef) {
          ef = { id: `ef-${Date.now()}`, userId: tx.userId, targetAmountInPaise: 10000000, currentBalanceInPaise: 0, updatedAt: new Date().toISOString() };
          db.emergencyFunds.push(ef);
        }
        ef.currentBalanceInPaise += amountInPaise;
        ef.updatedAt = new Date().toISOString();
        break;

      case 'emergency_withdrawal':
        let efW = db.emergencyFunds.find(e => e.userId === tx.userId);
        if (efW) {
          efW.currentBalanceInPaise = Math.max(0, efW.currentBalanceInPaise - amountInPaise);
          efW.updatedAt = new Date().toISOString();
        }
        if (destinationAccountId) {
          const bank = db.bankAccounts.find(b => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;

      case 'investment_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === 'Cash') {
          const cash = db.cashWallets.find(w => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        break;

      case 'savings_deposit':
        if (sourceAccountId) {
          const bank = db.bankAccounts.find(b => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        }
        break;
    }

    saveDatabase();
  }

  /**
   * Compounded Interest Calculation for Fixed Deposits
   * A = P * (1 + r / n) ^ (n * t)
   */
  static calculateFDMaturity(
    principalPaise: number,
    annualRatePercent: number,
    frequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Annually',
    durationMonths: number
  ) {
    const r = annualRatePercent / 100;
    const n = frequency === 'Monthly' ? 12 : frequency === 'Quarterly' ? 4 : frequency === 'Half-Yearly' ? 2 : 1;
    const t = durationMonths / 12;

    const maturityAmountPaise = Math.round(principalPaise * Math.pow(1 + r / n, n * t));
    const interestEarnedPaise = maturityAmountPaise - principalPaise;

    return {
      maturityAmountPaise,
      interestEarnedPaise
    };
  }
}
