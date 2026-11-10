import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IBankAccount,
  ICashWallet,
  ICreditCard,
  ITransaction,
  IBudgetAllocation,
  IInvestment,
  IFixedDeposit,
  IEmergencyFund,
  ISavingsGoal,
  INotification,
  IEmailLog
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseStore {
  users: IUser[];
  bankAccounts: IBankAccount[];
  cashWallets: ICashWallet[];
  creditCards: ICreditCard[];
  transactions: ITransaction[];
  budgetAllocations: IBudgetAllocation[];
  investments: IInvestment[];
  fixedDeposits: IFixedDeposit[];
  emergencyFunds: IEmergencyFund[];
  savingsGoals: ISavingsGoal[];
  notifications: INotification[];
  emailLogs: IEmailLog[];
}

let memoryDb: DatabaseStore = {
  users: [],
  bankAccounts: [],
  cashWallets: [],
  creditCards: [],
  transactions: [],
  budgetAllocations: [],
  investments: [],
  fixedDeposits: [],
  emergencyFunds: [],
  savingsGoals: [],
  notifications: [],
  emailLogs: []
};

let mongoConnected = false;
let mongoError: string | null = null;

export function getMongoStatus() {
  return {
    connected: mongoConnected,
    connectionState: mongoose.connection.readyState,
    error: mongoError,
    activeUri: process.env.MONGODB_URI ? 'Configured' : 'Not set (Using internal resilient store)'
  };
}

export async function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        memoryDb = JSON.parse(raw);
      } catch (err) {
        console.warn('Could not parse existing db.json, initializing fresh store:', err);
      }
    }

    // Try MongoDB connection if MONGODB_URI is provided
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.startsWith('mongodb')) {
      try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
        mongoConnected = true;
        mongoError = null;
        console.log('Successfully connected to MongoDB Atlas!');
      } catch (err: any) {
        mongoConnected = false;
        mongoError = err.message || 'Connection timeout';
        console.warn('MongoDB connection failed or timed out. Operating seamlessly with resilient ledger storage:', mongoError);
      }
    }

    // Ensure default demo user exists
    if (!memoryDb.users || memoryDb.users.length === 0) {
      await seedDemoUserAndScenarios();
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

export function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
}

export function getDb(): DatabaseStore {
  return memoryDb;
}

export async function seedDemoUserAndScenarios(targetUserId?: string): Promise<string> {
  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nowIso = now.toISOString();

  const userId = targetUserId || 'demo-user-id';

  const demoUser: IUser = {
    id: userId,
    name: 'Rajesh Sharma',
    email: 'rjrajeshpal30@gmail.com',
    passwordHash,
    isVerified: true,
    currency: 'INR',
    monthlyBudgetInPaise: 4000000, // ₹40,000
    reminderDayOfMonth: 25,
    emailNotificationsEnabled: true,
    createdAt: nowIso
  };

  // 1. Bank Accounts (HDFC & SBI)
  const hdfcAccount: IBankAccount = {
    id: 'bank-hdfc-01',
    userId,
    bankName: 'HDFC Bank',
    accountHolderName: 'Rajesh Sharma',
    accountType: 'Savings',
    accountNickname: 'HDFC Salary Account',
    accountNumberMasked: '•••• 4892',
    openingBalanceInPaise: 0,
    balanceInPaise: 6700000, // ₹67,000 (after transactions)
    isActive: true,
    notes: 'Primary salary account',
    createdAt: nowIso
  };

  const sbiAccount: IBankAccount = {
    id: 'bank-sbi-01',
    userId,
    bankName: 'State Bank of India',
    accountHolderName: 'Rajesh Sharma',
    accountType: 'Savings',
    accountNickname: 'SBI Savings',
    accountNumberMasked: '•••• 7120',
    openingBalanceInPaise: 1500000, // ₹15,000
    balanceInPaise: 1800000, // ₹18,000
    isActive: true,
    notes: 'Secondary emergency & bill pay account',
    createdAt: nowIso
  };

  // 2. Cash Wallet
  const cashWallet: ICashWallet = {
    id: 'cash-wallet-01',
    userId,
    balanceInPaise: 450000, // ₹4,500 (₹5,000 initial - ₹500 food expense)
    notes: 'Physical cash on hand',
    updatedAt: nowIso
  };

  // 3. Credit Cards (HDFC Regalia & ICICI Coral)
  const hdfcCreditCard: ICreditCard = {
    id: 'cc-hdfc-01',
    userId,
    cardName: 'HDFC Regalia Gold',
    bankName: 'HDFC Bank',
    cardNickname: 'HDFC Card',
    lastFourDigits: '9182',
    creditLimitInPaise: 15000000, // ₹1,50,000 limit
    outstandingBalanceInPaise: 300000, // ₹3,000 remaining (Scenario 8: had 10k, paid 7k)
    availableCreditInPaise: 14700000, // ₹1,47,000
    statementDay: 15,
    dueDay: 5,
    billingCycle: '16th to 15th',
    notes: 'Rewards on dining & travel',
    isActive: true,
    lastPaymentDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    lastPaymentAmountInPaise: 700000
  };

  // 4. Budget Allocation for current month
  const budgetAllocation: IBudgetAllocation = {
    id: `budget-${userId}-${currentMonthYear}`,
    userId,
    monthYear: currentMonthYear,
    essentialBudgetInPaise: 1800000, // ₹18,000
    funBudgetInPaise: 400000, // ₹4,000
    investmentBudgetInPaise: 800000, // ₹8,000
    emergencyBudgetInPaise: 500000, // ₹5,000
    savingsBudgetInPaise: 500000, // ₹5,000
    carryForwardEnabled: false
  };

  // 5. Emergency Fund
  const emergencyFund: IEmergencyFund = {
    id: 'emergency-fund-01',
    userId,
    targetAmountInPaise: 10000000, // ₹1,00,000
    currentBalanceInPaise: 3300000, // ₹33,000 (Scenario 7 added ₹3,000)
    updatedAt: nowIso
  };

  // 6. Savings Goals
  const savingsGoals: ISavingsGoal[] = [
    {
      id: 'saving-laptop-01',
      userId,
      name: 'MacBook Pro Upgrade',
      targetAmountInPaise: 12000000, // ₹1,20,000
      savedAmountInPaise: 4500000, // ₹45,000
      targetDate: '2027-03-31',
      monthlyContributionInPaise: 1000000,
      notes: 'For coding and freelance projects'
    },
    {
      id: 'saving-travel-01',
      userId,
      name: 'Annual Family Vacation',
      targetAmountInPaise: 6000000, // ₹60,000
      savedAmountInPaise: 3000000, // ₹30,000
      targetDate: '2026-12-25',
      monthlyContributionInPaise: 500000,
      notes: 'Year-end holiday'
    }
  ];

  // 7. Investments (Scenario 6 Mutual Fund + Stocks)
  const investments: IInvestment[] = [
    {
      id: 'inv-mf-01',
      userId,
      name: 'Parag Parikh Flexi Cap Fund',
      type: 'Mutual Funds',
      investedAmountInPaise: 500000, // ₹5,000 (Scenario 6)
      currentValueInPaise: 545000, // ₹5,450 (+9%)
      investmentDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      expectedReturnRate: 14.5,
      riskLevel: 'Moderate Risk',
      notes: 'Monthly SIP'
    },
    {
      id: 'inv-stocks-01',
      userId,
      name: 'NIFTY 50 Index Basket',
      type: 'Stocks',
      investedAmountInPaise: 2500000, // ₹25,000
      currentValueInPaise: 2820000, // ₹28,200 (+12.8%)
      investmentDate: new Date(Date.now() - 90 * 86400000).toISOString(),
      expectedReturnRate: 12,
      riskLevel: 'Moderate Risk',
      notes: 'Long-term equity allocation'
    }
  ];

  // 8. Fixed Deposit (Scenario 9: Principal ₹50,000, 1 year, 7.5% quarterly compounding)
  const fdStartDate = new Date(Date.now() - 335 * 86400000); // 30 days remaining!
  const fdMaturityDate = new Date(fdStartDate.getTime() + 365 * 86400000);
  const principal = 5000000; // ₹50,000 in paise
  const rate = 0.075;
  const n = 4; // Quarterly
  const t = 1;
  const maturityAmountPaise = Math.round(principal * Math.pow(1 + rate / n, n * t));
  const interestEarnedPaise = maturityAmountPaise - principal;

  const fixedDeposits: IFixedDeposit[] = [
    {
      id: 'fd-hdfc-01',
      userId,
      bankName: 'HDFC Bank',
      fdName: 'HDFC High Yield FD 1-Year',
      principalInPaise: principal,
      interestRate: 7.5,
      compoundingFrequency: 'Quarterly',
      startDate: fdStartDate.toISOString(),
      maturityDate: fdMaturityDate.toISOString(),
      durationMonths: 12,
      maturityAmountInPaise: maturityAmountPaise,
      interestEarnedInPaise: interestEarnedPaise,
      autoRenewal: false,
      status: 'Active',
      remindersSent: ['30d']
    }
  ];

  // 9. Pre-populate all 9 Mandatory Financial Scenarios in Transactions
  const transactions: ITransaction[] = [
    // Scenario 1: Salary ₹40,000 into HDFC
    {
      id: 'tx-scenario-1',
      userId,
      date: new Date(Date.now() - 10 * 86400000).toISOString(),
      type: 'income',
      mainCategory: 'Essential',
      subCategory: 'Salary',
      amountInPaise: 4000000, // ₹40,000
      paymentMethod: 'Bank Account',
      destinationAccountId: 'bank-hdfc-01',
      description: 'Monthly Salary Credit',
      notes: 'Scenario 1: Verified salary inflow directly to HDFC',
      status: 'Completed',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    // Scenario 2: Cash Expense ₹500 on Food
    {
      id: 'tx-scenario-2',
      userId,
      date: new Date(Date.now() - 8 * 86400000).toISOString(),
      type: 'expense',
      mainCategory: 'Essential',
      subCategory: 'Food',
      amountInPaise: 50000, // ₹500
      paymentMethod: 'Cash',
      description: 'Grocery & Fresh Food Market',
      notes: 'Scenario 2: Cash expense deducts cash balance & Essential allocation',
      status: 'Completed',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    // Scenario 3: Credit Card Purchase ₹2,000
    {
      id: 'tx-scenario-3',
      userId,
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      type: 'credit_card_expense',
      mainCategory: 'Essential',
      subCategory: 'Groceries',
      amountInPaise: 200000, // ₹2,000
      paymentMethod: 'Credit Card',
      creditCardId: 'cc-hdfc-01',
      description: 'Supermarket Household Supplies',
      notes: 'Scenario 3: Card outstanding increases without deducting bank balance',
      status: 'Completed',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    // Scenario 4: Credit Card Bill Payment ₹2,000 from SBI
    {
      id: 'tx-scenario-4',
      userId,
      date: new Date(Date.now() - 6 * 86400000).toISOString(),
      type: 'credit_card_payment',
      mainCategory: 'Liability Settlement',
      subCategory: 'Credit Card Bill Payment',
      amountInPaise: 200000, // ₹2,000
      paymentMethod: 'Bank Account',
      sourceAccountId: 'bank-sbi-01',
      creditCardId: 'cc-hdfc-01',
      description: 'Bill Settlement for HDFC Card',
      notes: 'Scenario 4: Paid from SBI; liability settled without duplicate expense',
      status: 'Completed',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    // Scenario 5: Bank Transfer ₹5,000 from HDFC to SBI
    {
      id: 'tx-scenario-5',
      userId,
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      type: 'transfer',
      mainCategory: 'Transfer',
      subCategory: 'Bank to Bank Transfer',
      amountInPaise: 500000, // ₹5,000
      paymentMethod: 'Bank Account',
      sourceAccountId: 'bank-hdfc-01',
      destinationAccountId: 'bank-sbi-01',
      description: 'Fund transfer to SBI for bill coverage',
      notes: 'Scenario 5: Interbank transfer; total wealth unchanged',
      status: 'Completed',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    // Scenario 6: Mutual Fund Investment ₹5,000 from HDFC
    {
      id: 'tx-scenario-6',
      userId,
      date: new Date(Date.now() - 4 * 86400000).toISOString(),
      type: 'investment_deposit',
      mainCategory: 'Investment',
      subCategory: 'Mutual Funds',
      amountInPaise: 500000, // ₹5,000
      paymentMethod: 'Bank Account',
      sourceAccountId: 'bank-hdfc-01',
      description: 'SIP in Parag Parikh Flexi Cap',
      notes: 'Scenario 6: Asset reallocation into investment holdings',
      status: 'Completed',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    // Scenario 7: Emergency Fund Deposit ₹3,000 from HDFC
    {
      id: 'tx-scenario-7',
      userId,
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      type: 'emergency_deposit',
      mainCategory: 'Emergency Fund',
      subCategory: 'Emergency Fund Deposit',
      amountInPaise: 300000, // ₹3,000
      paymentMethod: 'Bank Account',
      sourceAccountId: 'bank-hdfc-01',
      description: 'Monthly emergency cushion deposit',
      notes: 'Scenario 7: Dedicated reserve build without double expense',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    // Scenario 8: Partial Credit Card Payment (Owed ₹10,000, paid ₹7,000, remaining ₹3,000)
    {
      id: 'tx-scenario-8',
      userId,
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      type: 'credit_card_payment',
      mainCategory: 'Liability Settlement',
      subCategory: 'Credit Card Bill Payment',
      amountInPaise: 700000, // ₹7,000 paid towards 10k
      paymentMethod: 'Bank Account',
      sourceAccountId: 'bank-hdfc-01',
      creditCardId: 'cc-hdfc-01',
      description: 'Partial Bill Settlement for HDFC Card',
      notes: 'Scenario 8: Paid ₹7,000 against ₹10,000 outstanding; ₹3,000 remains',
      status: 'Completed',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ];

  // In-App Notifications
  const notifications: INotification[] = [
    {
      id: 'notif-fd-01',
      userId,
      title: 'Upcoming FD Maturity in 30 Days',
      message: 'Your HDFC High Yield FD (₹50,000 principal) matures soon. Projected payout: ₹53,854.',
      type: 'fd_maturity',
      isRead: false,
      metadata: { fdId: 'fd-hdfc-01', daysRemaining: 30 },
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'notif-cc-01',
      userId,
      title: 'Credit Card Bill Reminder',
      message: 'HDFC Regalia Gold has ₹3,000 outstanding due on the 5th. Avoid late fees.',
      type: 'bill_reminder',
      isRead: false,
      metadata: { cardId: 'cc-hdfc-01', amountInPaise: 300000 },
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
    }
  ];

  // Simulated Email Logs in Sandbox
  const emailLogs: IEmailLog[] = [
    {
      id: 'email-welcome-01',
      userId,
      to: 'rjrajeshpal30@gmail.com',
      subject: 'Welcome to FinPulse - Verify Your Email',
      previewText: 'Click here or use code 849201 to complete your email verification.',
      htmlBody: `<div style="font-family:sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
        <h2 style="color:#2563eb;">FinPulse Security Verification</h2>
        <p>Hello Rajesh,</p>
        <p>Thank you for setting up your personal finance management account. Your secure 6-digit verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#e2e8f0;padding:16px;text-align:center;border-radius:8px;margin:16px 0;">849201</div>
        <p>You can also verify instantly by clicking the link below:</p>
        <a href="#/verify-email?token=verified-demo-token" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Verify My Account</a>
      </div>`,
      sentAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: 'simulated',
      triggerType: 'verification',
      metadata: { otp: '849201' }
    },
    {
      id: 'email-bill-reminder-01',
      userId,
      to: 'rjrajeshpal30@gmail.com',
      subject: 'Credit Card Statement Alert: HDFC Regalia Gold',
      previewText: 'Your monthly statement is generated. Outstanding balance: ₹3,000 due by the 5th.',
      htmlBody: `<div style="font-family:sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
        <h2 style="color:#d97706;">Credit Card Payment Reminder</h2>
        <p>Hello Rajesh,</p>
        <p>This is a reminder from FinPulse regarding your <strong>HDFC Regalia Gold (•••• 9182)</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Remaining Outstanding:</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:bold;">₹3,000.00</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Payment Due Date:</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">5th of Month</td></tr>
        </table>
        <p>Ensure settlement from your linked bank account before the due date to maintain your credit score.</p>
      </div>`,
      sentAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      status: 'simulated',
      triggerType: 'cc_bill_reminder'
    }
  ];

  // Filter out any existing data for this user and inject seeded items
  memoryDb.users = memoryDb.users.filter(u => u.id !== userId).concat(demoUser);
  memoryDb.bankAccounts = memoryDb.bankAccounts.filter(a => a.userId !== userId).concat([hdfcAccount, sbiAccount]);
  memoryDb.cashWallets = memoryDb.cashWallets.filter(w => w.userId !== userId).concat(cashWallet);
  memoryDb.creditCards = memoryDb.creditCards.filter(c => c.userId !== userId).concat(hdfcCreditCard);
  memoryDb.budgetAllocations = memoryDb.budgetAllocations.filter(b => b.userId !== userId).concat(budgetAllocation);
  memoryDb.emergencyFunds = memoryDb.emergencyFunds.filter(e => e.userId !== userId).concat(emergencyFund);
  memoryDb.savingsGoals = memoryDb.savingsGoals.filter(s => s.userId !== userId).concat(savingsGoals);
  memoryDb.investments = memoryDb.investments.filter(i => i.userId !== userId).concat(investments);
  memoryDb.fixedDeposits = memoryDb.fixedDeposits.filter(f => f.userId !== userId).concat(fixedDeposits);
  memoryDb.transactions = memoryDb.transactions.filter(t => t.userId !== userId).concat(transactions);
  memoryDb.notifications = memoryDb.notifications.filter(n => n.userId !== userId).concat(notifications);
  memoryDb.emailLogs = memoryDb.emailLogs.concat(emailLogs);

  saveDatabase();
  return userId;
}
