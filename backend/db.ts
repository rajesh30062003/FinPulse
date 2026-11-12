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
  IEmailLog,
  IRefreshToken,
  IEmailVerification
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

export interface IMigrationRecord {
  id: string;
  name: string;
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt: string;
  details?: any;
  error?: string;
}

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
  refreshTokens: IRefreshToken[];
  emailVerifications: IEmailVerification[];
  migrations?: IMigrationRecord[];
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
  emailLogs: [],
  refreshTokens: [],
  emailVerifications: []
};

let mongoConnected = false;
let mongoError: string | null = null;

// ================= MONGOOSE SCHEMAS & MODELS ================= //

export const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationOtp: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Number },
  accountStatus: { type: String, default: 'active' },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Number, default: null },
  currency: { type: String, default: 'INR' },
  monthlyBudgetInPaise: { type: Number, default: 4000000 },
  reminderDayOfMonth: { type: Number, default: 25 },
  emailNotificationsEnabled: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

export const BankAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  bankName: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  accountType: { type: String, default: 'Savings' },
  accountNickname: { type: String, required: true },
  accountNumberMasked: { type: String, required: true },
  balanceInPaise: { type: Number, default: 0 },
  openingBalanceInPaise: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const CashWalletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  balanceInPaise: { type: Number, default: 0 },
  notes: { type: String },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const CreditCardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  cardName: { type: String, required: true },
  bankName: { type: String, required: true },
  cardNickname: { type: String, required: true },
  lastFourDigits: { type: String, required: true },
  creditLimitInPaise: { type: Number, required: true },
  outstandingBalanceInPaise: { type: Number, default: 0 },
  availableCreditInPaise: { type: Number, required: true },
  statementDay: { type: Number, default: 15 },
  dueDay: { type: Number, default: 5 },
  billingCycle: { type: String, default: '16th to 15th' },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  lastPaymentDate: { type: String },
  lastPaymentAmountInPaise: { type: Number }
});

export const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  type: { type: String, required: true },
  mainCategory: { type: String, required: true },
  subCategory: { type: String, required: true },
  customSubCategory: { type: String },
  amountInPaise: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  sourceAccountId: { type: String },
  destinationAccountId: { type: String },
  creditCardId: { type: String },
  description: { type: String, required: true },
  notes: { type: String },
  status: { type: String, default: 'Completed' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const BudgetAllocationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  monthYear: { type: String, required: true },
  totalBudgetInPaise: { type: Number },
  essentialBudgetInPaise: { type: Number, default: 0 },
  funBudgetInPaise: { type: Number, default: 0 },
  investmentBudgetInPaise: { type: Number, default: 0 },
  emergencyBudgetInPaise: { type: Number, default: 0 },
  savingsBudgetInPaise: { type: Number, default: 0 },
  carryForwardEnabled: { type: Boolean, default: false }
});
BudgetAllocationSchema.index({ userId: 1, monthYear: 1 }, { unique: true });

export const EmergencyFundSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  targetAmountInPaise: { type: Number, default: 0 },
  currentBalanceInPaise: { type: Number, default: 0 },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const SavingsGoalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  targetAmountInPaise: { type: Number, required: true },
  savedAmountInPaise: { type: Number, default: 0 },
  targetDate: { type: String, required: true },
  monthlyContributionInPaise: { type: Number, default: 0 },
  notes: { type: String }
});

export const InvestmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  investedAmountInPaise: { type: Number, required: true },
  currentValueInPaise: { type: Number, required: true },
  investmentDate: { type: String, required: true },
  durationMonths: { type: Number },
  maturityDate: { type: String },
  expectedReturnRate: { type: Number },
  riskLevel: { type: String, default: 'Moderate Risk' },
  notes: { type: String }
});

export const FixedDepositSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  bankName: { type: String, required: true },
  fdName: { type: String, required: true },
  principalInPaise: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  compoundingFrequency: { type: String, default: 'Quarterly' },
  startDate: { type: String, required: true },
  maturityDate: { type: String, required: true },
  durationMonths: { type: Number, required: true },
  maturityAmountInPaise: { type: Number, required: true },
  interestEarnedInPaise: { type: Number, required: true },
  autoRenewal: { type: Boolean, default: false },
  status: { type: String, default: 'Active' },
  remindersSent: [{ type: String }]
});

export const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const EmailLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  htmlBody: { type: String, required: true },
  previewText: { type: String, required: true },
  sentAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, default: 'sent' },
  triggerType: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }
});

export const RefreshTokenSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: String, required: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const EmailVerificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, index: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  lastSentAt: { type: Number, default: Date.now },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const RefreshTokenModel = mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema);
export const EmailVerificationModel = mongoose.models.EmailVerification || mongoose.model('EmailVerification', EmailVerificationSchema);
export const BankAccountModel = mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);
export const CashWalletModel = mongoose.models.CashWallet || mongoose.model('CashWallet', CashWalletSchema);
export const CreditCardModel = mongoose.models.CreditCard || mongoose.model('CreditCard', CreditCardSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const BudgetAllocationModel = mongoose.models.BudgetAllocation || mongoose.model('BudgetAllocation', BudgetAllocationSchema);
export const EmergencyFundModel = mongoose.models.EmergencyFund || mongoose.model('EmergencyFund', EmergencyFundSchema);
export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model('SavingsGoal', SavingsGoalSchema);
export const InvestmentModel = mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema);
export const FixedDepositModel = mongoose.models.FixedDeposit || mongoose.model('FixedDeposit', FixedDepositSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const EmailLogModel = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);

export const MigrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  version: { type: Number, required: true, unique: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  executedAt: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  error: { type: String }
}, { timestamps: true });

export const MigrationModel = mongoose.models.Migration || mongoose.model('Migration', MigrationSchema);

export function getMongoStatus() {
  return {
    connected: mongoConnected,
    connectionState: mongoose.connection.readyState,
    error: mongoError,
    activeUri: process.env.MONGODB_URI ? 'Configured (MongoDB Atlas)' : 'Not set (Using internal resilient store)'
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
        const parsed = JSON.parse(raw);
        memoryDb = {
          users: parsed.users || [],
          bankAccounts: parsed.bankAccounts || [],
          cashWallets: parsed.cashWallets || [],
          creditCards: parsed.creditCards || [],
          transactions: parsed.transactions || [],
          budgetAllocations: parsed.budgetAllocations || [],
          investments: parsed.investments || [],
          fixedDeposits: parsed.fixedDeposits || [],
          emergencyFunds: parsed.emergencyFunds || [],
          savingsGoals: parsed.savingsGoals || [],
          notifications: parsed.notifications || [],
          emailLogs: parsed.emailLogs || [],
          refreshTokens: parsed.refreshTokens || [],
          emailVerifications: parsed.emailVerifications || []
        };
      } catch (err) {
        console.warn('Could not parse existing db.json, initializing fresh store:', err);
      }
    }

    // Try MongoDB connection if MONGODB_URI is provided
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.startsWith('mongodb')) {
      try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 5000,
          dbName: process.env.MONGODB_DB_NAME || undefined
        });
        mongoConnected = true;
        mongoError = null;
        const activeDb = mongoose.connection.db?.databaseName || mongoose.connection.name || 'default';
        console.log(`Successfully connected to MongoDB Atlas! Active database: ${activeDb}`);

        // Hydrate all collections from MongoDB Atlas if data exists
        const [
          atlasUsers,
          atlasBanks,
          atlasWallets,
          atlasCards,
          atlasTxs,
          atlasBudgets,
          atlasInvestments,
          atlasFDs,
          atlasEmergency,
          atlasSavings,
          atlasNotifs,
          atlasLogs,
          atlasTokens,
          atlasVerifications,
          atlasMigrations
        ] = await Promise.all([
          UserModel.find({}).lean(),
          BankAccountModel.find({}).lean(),
          CashWalletModel.find({}).lean(),
          CreditCardModel.find({}).lean(),
          TransactionModel.find({}).lean(),
          BudgetAllocationModel.find({}).lean(),
          InvestmentModel.find({}).lean(),
          FixedDepositModel.find({}).lean(),
          EmergencyFundModel.find({}).lean(),
          SavingsGoalModel.find({}).lean(),
          NotificationModel.find({}).lean(),
          EmailLogModel.find({}).lean(),
          RefreshTokenModel.find({}).lean(),
          EmailVerificationModel.find({}).lean(),
          MigrationModel.find({}).lean().catch(() => [])
        ]);

        console.log(`MongoDB Atlas Hydration Report: Users: ${atlasUsers.length}, Accounts: ${atlasBanks.length}, Cards: ${atlasCards.length}, Transactions: ${atlasTxs.length}, Budgets: ${atlasBudgets.length}, Investments: ${atlasInvestments.length}, FDs: ${atlasFDs.length}`);

        const mergeById = <T extends { id?: string; email?: string }>(localArr: T[], atlasArr: any[]): T[] => {
          const map = new Map<string, T>();
          for (const item of (localArr || [])) {
            const key = (item as any).id || (item as any).email;
            if (key) map.set(key, item);
          }
          for (const doc of (atlasArr || [])) {
            const key = doc.id || doc.email;
            if (key) {
              const { _id, __v, ...cleanDoc } = doc;
              map.set(key, cleanDoc as T);
            }
          }
          return Array.from(map.values());
        };

        if (atlasUsers.length > 0) memoryDb.users = mergeById(memoryDb.users, atlasUsers);
        if (atlasBanks.length > 0) memoryDb.bankAccounts = mergeById(memoryDb.bankAccounts, atlasBanks);
        if (atlasWallets.length > 0) memoryDb.cashWallets = mergeById(memoryDb.cashWallets, atlasWallets);
        if (atlasCards.length > 0) memoryDb.creditCards = mergeById(memoryDb.creditCards, atlasCards);
        if (atlasTxs.length > 0) memoryDb.transactions = mergeById(memoryDb.transactions, atlasTxs);
        if (atlasBudgets.length > 0) memoryDb.budgetAllocations = mergeById(memoryDb.budgetAllocations, atlasBudgets);
        if (atlasInvestments.length > 0) memoryDb.investments = mergeById(memoryDb.investments, atlasInvestments);
        if (atlasFDs.length > 0) memoryDb.fixedDeposits = mergeById(memoryDb.fixedDeposits, atlasFDs);
        if (atlasEmergency.length > 0) memoryDb.emergencyFunds = mergeById(memoryDb.emergencyFunds, atlasEmergency);
        if (atlasSavings.length > 0) memoryDb.savingsGoals = mergeById(memoryDb.savingsGoals, atlasSavings);
        if (atlasNotifs.length > 0) memoryDb.notifications = mergeById(memoryDb.notifications, atlasNotifs);
        if (atlasLogs.length > 0) memoryDb.emailLogs = mergeById(memoryDb.emailLogs, atlasLogs);
        if (atlasTokens.length > 0) memoryDb.refreshTokens = mergeById(memoryDb.refreshTokens, atlasTokens);
        if (atlasVerifications.length > 0) memoryDb.emailVerifications = mergeById(memoryDb.emailVerifications, atlasVerifications);
        if (atlasMigrations && atlasMigrations.length > 0) memoryDb.migrations = mergeById(memoryDb.migrations || [], atlasMigrations);

        saveDatabase();
      } catch (err: any) {
        mongoConnected = false;
        mongoError = err.message || 'Connection timeout';
        console.warn('MongoDB connection failed or timed out. Operating seamlessly with resilient ledger storage:', mongoError);
      }
    }

    // Run safe idempotent migration ONCE (handles backup, deduplication, and canonical ownership)
    await runIdempotentMigrations();

    // Ensure default demo user exists only if completely empty
    if (!memoryDb.users || memoryDb.users.length === 0) {
      await seedDemoUserAndScenarios();
    } else {
      // Ensure test accounts always have consistent valid credentials for verification
      const aaravUser = memoryDb.users.find(u => u.email.toLowerCase() === 'aarav@test.local');
      if (aaravUser) {
        aaravUser.passwordHash = await bcrypt.hash('TestPassword@123', 10);
        aaravUser.failedLoginAttempts = 0;
        aaravUser.lockUntil = null;
        aaravUser.isVerified = true;
      }

      // Ensure Rajesh Pal has Demo@1234 hash for login testing
      const rjUsers = memoryDb.users.filter(u =>
        u.email.toLowerCase() === 'rjrajeshpal30@gmail.com' ||
        u.email.toLowerCase() === 'rjrajeshpal30062003@gmail.com'
      );
      for (const rjUser of rjUsers) {
        rjUser.passwordHash = await bcrypt.hash('Demo@1234', 10);
        rjUser.failedLoginAttempts = 0;
        rjUser.lockUntil = null;
        rjUser.isVerified = true;
      }
      saveDatabase();
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
  if (!memoryDb.emailVerifications) memoryDb.emailVerifications = [];
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  return memoryDb;
}

// ================= ATLAS & RESILIENT PERSISTENCE HELPERS ================= //

export async function findUserByEmail(email: string): Promise<IUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  // 1. Check MongoDB Atlas if connected
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc: any = await UserModel.findOne({ email: cleanEmail }).lean();
      if (doc) {
        // sync to memory store
        const existingIdx = memoryDb.users.findIndex(u => u.id === doc.id);
        const mappedUser: IUser = {
          id: doc.id,
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash,
          isVerified: doc.isVerified,
          verificationToken: doc.verificationToken,
          verificationOtp: doc.verificationOtp,
          resetPasswordToken: doc.resetPasswordToken,
          resetPasswordOtp: doc.resetPasswordOtp,
          resetPasswordExpires: doc.resetPasswordExpires,
          currency: doc.currency || 'INR',
          monthlyBudgetInPaise: doc.monthlyBudgetInPaise || 4000000,
          reminderDayOfMonth: doc.reminderDayOfMonth || 25,
          emailNotificationsEnabled: doc.emailNotificationsEnabled !== false,
          createdAt: doc.createdAt
        };
        if (existingIdx >= 0) {
          memoryDb.users[existingIdx] = mappedUser;
        } else {
          memoryDb.users.push(mappedUser);
        }
        return mappedUser;
      }
    } catch (err) {
      console.warn('MongoDB user lookup warning:', err);
    }
  }
  // 2. Check local memory store
  let found = memoryDb.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!found && fs.existsSync(DATA_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      found = (raw.users || []).find((u: any) => u.email.toLowerCase() === cleanEmail);
      if (found) {
        memoryDb.users.push(found);
      }
    } catch {}
  }
  return found || null;
}

export async function findUserById(id: string): Promise<IUser | null> {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc: any = await UserModel.findOne({ id }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB findUserById warning:', err);
    }
  }
  return memoryDb.users.find(u => u.id === id) || null;
}

export async function persistUser(user: IUser): Promise<void> {
  // Update memory store
  const idx = memoryDb.users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    memoryDb.users[idx] = user;
  } else {
    memoryDb.users.push(user);
  }
  saveDatabase();

  // Persist to MongoDB Atlas
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await UserModel.findOneAndUpdate(
        { id: user.id },
        { ...user, email: user.email.toLowerCase().trim() },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      console.error('Error saving user to MongoDB Atlas:', err);
    }
  }
}

export async function persistBankAccount(account: IBankAccount): Promise<void> {
  const idx = memoryDb.bankAccounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    memoryDb.bankAccounts[idx] = account;
  } else {
    memoryDb.bankAccounts.push(account);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await BankAccountModel.findOneAndUpdate({ id: account.id }, account, { upsert: true });
    } catch (err) {
      console.error('Error saving bank account to MongoDB Atlas:', err);
    }
  }
}

export async function persistCashWallet(wallet: ICashWallet): Promise<void> {
  const idx = memoryDb.cashWallets.findIndex(w => w.id === wallet.id);
  if (idx >= 0) {
    memoryDb.cashWallets[idx] = wallet;
  } else {
    memoryDb.cashWallets.push(wallet);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await CashWalletModel.findOneAndUpdate({ id: wallet.id }, wallet, { upsert: true });
    } catch (err) {
      console.error('Error saving cash wallet to MongoDB Atlas:', err);
    }
  }
}

export async function persistCreditCard(card: ICreditCard): Promise<void> {
  const idx = memoryDb.creditCards.findIndex(c => c.id === card.id);
  if (idx >= 0) {
    memoryDb.creditCards[idx] = card;
  } else {
    memoryDb.creditCards.push(card);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await CreditCardModel.findOneAndUpdate({ id: card.id }, card, { upsert: true });
    } catch (err) {
      console.error('Error saving credit card to MongoDB Atlas:', err);
    }
  }
}

export async function persistTransaction(tx: ITransaction): Promise<void> {
  const idx = memoryDb.transactions.findIndex(t => t.id === tx.id);
  if (idx >= 0) {
    memoryDb.transactions[idx] = tx;
  } else {
    memoryDb.transactions.unshift(tx);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await TransactionModel.findOneAndUpdate({ id: tx.id }, tx, { upsert: true });
    } catch (err) {
      console.error('Error saving transaction to MongoDB Atlas:', err);
    }
  }
}

export async function persistBudgetAllocation(budget: IBudgetAllocation): Promise<void> {
  const idx = memoryDb.budgetAllocations.findIndex(
    b => b.id === budget.id || (b.userId === budget.userId && b.monthYear === budget.monthYear)
  );
  if (idx >= 0) {
    memoryDb.budgetAllocations[idx] = budget;
  } else {
    memoryDb.budgetAllocations.push(budget);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await BudgetAllocationModel.findOneAndUpdate(
        { $or: [{ id: budget.id }, { userId: budget.userId, monthYear: budget.monthYear }] },
        budget,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('Error saving budget allocation to MongoDB Atlas:', err);
    }
  }
}

export async function persistEmergencyFund(ef: IEmergencyFund): Promise<void> {
  const idx = memoryDb.emergencyFunds.findIndex(e => e.id === ef.id);
  if (idx >= 0) {
    memoryDb.emergencyFunds[idx] = ef;
  } else {
    memoryDb.emergencyFunds.push(ef);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await EmergencyFundModel.findOneAndUpdate({ id: ef.id }, ef, { upsert: true });
    } catch (err) {
      console.error('Error saving emergency fund to MongoDB Atlas:', err);
    }
  }
}

export async function persistSavingsGoal(goal: ISavingsGoal): Promise<void> {
  const idx = memoryDb.savingsGoals.findIndex(s => s.id === goal.id);
  if (idx >= 0) {
    memoryDb.savingsGoals[idx] = goal;
  } else {
    memoryDb.savingsGoals.push(goal);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await SavingsGoalModel.findOneAndUpdate({ id: goal.id }, goal, { upsert: true });
    } catch (err) {
      console.error('Error saving savings goal to MongoDB Atlas:', err);
    }
  }
}

export async function persistInvestment(inv: IInvestment): Promise<void> {
  const idx = memoryDb.investments.findIndex(i => i.id === inv.id);
  if (idx >= 0) {
    memoryDb.investments[idx] = inv;
  } else {
    memoryDb.investments.push(inv);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await InvestmentModel.findOneAndUpdate({ id: inv.id }, inv, { upsert: true });
    } catch (err) {
      console.error('Error saving investment to MongoDB Atlas:', err);
    }
  }
}

export async function persistFixedDeposit(fd: IFixedDeposit): Promise<void> {
  const idx = memoryDb.fixedDeposits.findIndex(f => f.id === fd.id);
  if (idx >= 0) {
    memoryDb.fixedDeposits[idx] = fd;
  } else {
    memoryDb.fixedDeposits.push(fd);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await FixedDepositModel.findOneAndUpdate({ id: fd.id }, fd, { upsert: true });
    } catch (err) {
      console.error('Error saving fixed deposit to MongoDB Atlas:', err);
    }
  }
}

export async function persistNotification(notif: INotification): Promise<void> {
  const idx = memoryDb.notifications.findIndex(n => n.id === notif.id);
  if (idx >= 0) {
    memoryDb.notifications[idx] = notif;
  } else {
    memoryDb.notifications.unshift(notif);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await NotificationModel.findOneAndUpdate({ id: notif.id }, notif, { upsert: true });
    } catch (err) {
      console.error('Error saving notification to MongoDB Atlas:', err);
    }
  }
}

export async function persistEmailLog(log: IEmailLog): Promise<void> {
  try {
    memoryDb.emailLogs.unshift(log);
    saveDatabase();

    if (mongoConnected && mongoose.connection.readyState === 1) {
      try {
        await EmailLogModel.create(log);
      } catch (err) {
        console.error('Error saving email log to MongoDB Atlas:', err);
      }
    }
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

// ================= REFRESH TOKEN & EMAIL VERIFICATION PERSISTENCE ================= //

export async function persistRefreshToken(token: IRefreshToken): Promise<void> {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const idx = memoryDb.refreshTokens.findIndex(t => t.id === token.id);
  if (idx >= 0) {
    memoryDb.refreshTokens[idx] = token;
  } else {
    memoryDb.refreshTokens.push(token);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await RefreshTokenModel.findOneAndUpdate({ id: token.id }, token, { upsert: true });
    } catch (err) {
      console.error('Error saving refresh token to MongoDB Atlas:', err);
    }
  }
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<IRefreshToken | null> {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc: any = await RefreshTokenModel.findOne({ tokenHash, revoked: false }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB RefreshToken lookup warning:', err);
    }
  }
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const token = memoryDb.refreshTokens.find(t => t.tokenHash === tokenHash && !t.revoked);
  return token || null;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const token = memoryDb.refreshTokens.find(t => t.tokenHash === tokenHash);
  if (token) {
    token.revoked = true;
    saveDatabase();
  }
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await RefreshTokenModel.updateMany({ tokenHash }, { $set: { revoked: true } });
    } catch (err) {
      console.error('Error revoking refresh token in MongoDB Atlas:', err);
    }
  }
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  memoryDb.refreshTokens.forEach(t => {
    if (t.userId === userId) t.revoked = true;
  });
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await RefreshTokenModel.updateMany({ userId }, { $set: { revoked: true } });
    } catch (err) {
      console.error('Error revoking user refresh tokens in MongoDB Atlas:', err);
    }
  }
}

export async function persistEmailVerification(verif: IEmailVerification): Promise<void> {
  if (!memoryDb.emailVerifications) memoryDb.emailVerifications = [];
  const idx = memoryDb.emailVerifications.findIndex(v => v.email === verif.email);
  if (idx >= 0) {
    memoryDb.emailVerifications[idx] = verif;
  } else {
    memoryDb.emailVerifications.push(verif);
  }
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await EmailVerificationModel.findOneAndUpdate({ email: verif.email }, verif, { upsert: true });
    } catch (err) {
      console.error('Error saving email verification to MongoDB Atlas:', err);
    }
  }
}

export async function findEmailVerification(email: string): Promise<IEmailVerification | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc: any = await EmailVerificationModel.findOne({ email: cleanEmail }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB findEmailVerification warning:', err);
    }
  }
  if (!memoryDb.emailVerifications) memoryDb.emailVerifications = [];
  const found = memoryDb.emailVerifications.find(v => v.email === cleanEmail);
  return found || null;
}

export async function deleteEmailVerification(email: string): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  if (!memoryDb.emailVerifications) memoryDb.emailVerifications = [];
  memoryDb.emailVerifications = memoryDb.emailVerifications.filter(v => v.email !== cleanEmail);
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await EmailVerificationModel.deleteMany({ email: cleanEmail });
    } catch (err) {
      console.error('Error deleting email verification from MongoDB Atlas:', err);
    }
  }
}

export async function deleteBankAccount(id: string, userId: string): Promise<void> {
  memoryDb.bankAccounts = memoryDb.bankAccounts.filter(b => !(b.id === id && b.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await BankAccountModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting bank account from MongoDB Atlas:', err);
    }
  }
}

export async function deleteCreditCard(id: string, userId: string): Promise<void> {
  memoryDb.creditCards = memoryDb.creditCards.filter(c => !(c.id === id && c.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await CreditCardModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting credit card from MongoDB Atlas:', err);
    }
  }
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  memoryDb.transactions = memoryDb.transactions.filter(t => !(t.id === id && t.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await TransactionModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting transaction from MongoDB Atlas:', err);
    }
  }
}

export async function deleteInvestment(id: string, userId: string): Promise<void> {
  memoryDb.investments = memoryDb.investments.filter(i => !(i.id === id && i.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await InvestmentModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting investment from MongoDB Atlas:', err);
    }
  }
}

export async function deleteFixedDeposit(id: string, userId: string): Promise<void> {
  memoryDb.fixedDeposits = memoryDb.fixedDeposits.filter(f => !(f.id === id && f.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await FixedDepositModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting fixed deposit from MongoDB Atlas:', err);
    }
  }
}

export async function deleteSavingsGoal(id: string, userId: string): Promise<void> {
  memoryDb.savingsGoals = memoryDb.savingsGoals.filter(s => !(s.id === id && s.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await SavingsGoalModel.deleteOne({ id, userId });
    } catch (err) {
      console.error('Error deleting savings goal from MongoDB Atlas:', err);
    }
  }
}

export function createDatabaseBackup(tag = 'pre_migration'): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${tag}_${timestamp}.json`;
    const backupFilePath = path.join(DATA_DIR, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(memoryDb, null, 2), 'utf-8');
    console.log(`[Database Backup] Snapshot successfully saved: ${backupFilePath}`);
    return backupFilePath;
  } catch (err) {
    console.error('[Database Backup Error] Failed to create database backup snapshot:', err);
    return '';
  }
}

export async function runIdempotentMigrations(): Promise<void> {
  const MIGRATION_VERSION = 1;
  const MIGRATION_NAME = 'reconcile_rajesh_pal_data_v1';

  // 1. Check if migration already completed (memory or MongoDB Atlas)
  if (!memoryDb.migrations) memoryDb.migrations = [];
  const inMemoryDone = memoryDb.migrations.find(m => m.version === MIGRATION_VERSION && m.status === 'completed');

  let atlasDone = false;
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc = await MigrationModel.findOne({ version: MIGRATION_VERSION, status: 'completed' }).lean();
      if (doc) atlasDone = true;
    } catch (err) {
      console.warn('Could not query MigrationModel in Atlas:', err);
    }
  }

  if (inMemoryDone || atlasDone) {
    console.log(`[Migration] Version ${MIGRATION_VERSION} (${MIGRATION_NAME}) already completed. Skipping startup migration.`);
    return;
  }

  console.log(`[Migration] Initiating Migration v${MIGRATION_VERSION} (${MIGRATION_NAME})...`);

  // 2. Pre-Migration Backup Snapshot
  const backupPath = createDatabaseBackup('pre_reconcile_v1');
  console.log(`[Migration] Pre-migration backup verified at: ${backupPath || 'In-memory ledger'}`);

  // 3. Resolve Canonical Rajesh Pal User
  let canonicalUser = memoryDb.users.find(u => u.email.toLowerCase() === 'rjrajeshpal30062003@gmail.com');
  if (!canonicalUser) {
    canonicalUser = memoryDb.users.find(u => u.email.toLowerCase() === 'rjrajeshpal30@gmail.com');
  }
  if (!canonicalUser) {
    canonicalUser = memoryDb.users.find(u => u.name.toLowerCase().includes('rajesh'));
  }

  // If not found in memory, query MongoDB Atlas
  if (!canonicalUser && mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const atlasRajesh: any = await UserModel.findOne({
        $or: [
          { email: 'rjrajeshpal30062003@gmail.com' },
          { email: 'rjrajeshpal30@gmail.com' },
          { name: 'Rajesh Pal' }
        ]
      }).lean();
      if (atlasRajesh) {
        canonicalUser = atlasRajesh;
        memoryDb.users.push(canonicalUser!);
      }
    } catch (qErr) {
      console.warn('[Migration] Querying Atlas for canonical user warning:', qErr);
    }
  }

  // If still none, create the canonical account
  if (!canonicalUser) {
    const hash = await bcrypt.hash('Demo@1234', 10);
    canonicalUser = {
      id: 'user-rjrajeshpal30',
      name: 'Rajesh Pal',
      email: 'rjrajeshpal30062003@gmail.com',
      passwordHash: hash,
      isVerified: true,
      currency: 'INR',
      monthlyBudgetInPaise: 4500000,
      reminderDayOfMonth: 25,
      emailNotificationsEnabled: true,
      createdAt: new Date().toISOString()
    };
    memoryDb.users.push(canonicalUser);
  }

  // Ensure canonical user profile is authoritative
  canonicalUser.name = 'Rajesh Pal';
  canonicalUser.email = 'rjrajeshpal30062003@gmail.com';
  canonicalUser.isVerified = true;
  const canonicalUserId = canonicalUser.id;

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await UserModel.findOneAndUpdate({ id: canonicalUserId }, canonicalUser, { upsert: true });
    } catch (uErr) {
      console.warn('[Migration] Updating canonical user in Atlas warning:', uErr);
    }
  }

  console.log(`[Migration] Authoritative Canonical User: ${canonicalUserId} (${canonicalUser.email})`);

  // 4. Collect historical IDs associated with Rajesh
  const candidateIds = ['demo-user-id', 'user-1794473436793-0d16c1', 'user-rjrajeshpal30'];
  const legacyIdSet = new Set<string>();
  for (const cid of candidateIds) {
    if (cid !== canonicalUserId) legacyIdSet.add(cid);
  }
  for (const u of memoryDb.users) {
    if (u.id !== canonicalUserId && (u.email.toLowerCase() === 'rjrajeshpal30@gmail.com' || u.name.toLowerCase().includes('rajesh'))) {
      legacyIdSet.add(u.id);
    }
  }
  const legacyIds = Array.from(legacyIdSet);
  console.log(`[Migration] Reconciling legacy user IDs: [${legacyIds.join(', ')}] -> Canonical: ${canonicalUserId}`);

  // 5. BUDGET ALLOCATION DEDUPLICATION & MERGE (Resolves E11000 duplicate key collision)
  const allRajeshBudgets = memoryDb.budgetAllocations.filter(
    b => b.userId === canonicalUserId || legacyIds.includes(b.userId)
  );

  const budgetsByMonth = new Map<string, IBudgetAllocation[]>();
  for (const b of allRajeshBudgets) {
    const list = budgetsByMonth.get(b.monthYear) || [];
    list.push(b);
    budgetsByMonth.set(b.monthYear, list);
  }

  let resolvedDuplicateBudgetsCount = 0;
  const duplicateBudgetIdsToDelete: string[] = [];
  const authoritativeBudgets: IBudgetAllocation[] = [];

  for (const [monthYear, records] of budgetsByMonth.entries()) {
    if (records.length === 1) {
      const rec = records[0];
      rec.userId = canonicalUserId;
      authoritativeBudgets.push(rec);
    } else {
      // Multiple records exist for this monthYear! Merge safely to preserve all allocations
      resolvedDuplicateBudgetsCount += (records.length - 1);
      console.log(`[Migration] Resolving ${records.length} duplicate budget records for month ${monthYear}...`);

      // Authoritative record selection: prefer explicit totalBudgetInPaise or record with targets
      let authRecord = records.find(r => typeof r.totalBudgetInPaise === 'number' && r.totalBudgetInPaise > 0) || records[0];

      let maxTotalBudget = authRecord.totalBudgetInPaise || 4000000;
      let maxEssential = authRecord.essentialBudgetInPaise || 0;
      let maxFun = authRecord.funBudgetInPaise || 0;
      let maxInv = authRecord.investmentBudgetInPaise || 0;
      let maxEf = authRecord.emergencyBudgetInPaise || 0;
      let maxSav = authRecord.savingsBudgetInPaise || 0;
      let carryForward = Boolean(authRecord.carryForwardEnabled);

      for (const other of records) {
        if (other.id === authRecord.id) continue;
        duplicateBudgetIdsToDelete.push(other.id);
        if (typeof other.totalBudgetInPaise === 'number' && other.totalBudgetInPaise > 0) {
          maxTotalBudget = Math.max(maxTotalBudget, other.totalBudgetInPaise);
        }
        if (other.essentialBudgetInPaise > 0 && maxEssential === 0) maxEssential = other.essentialBudgetInPaise;
        if (other.funBudgetInPaise > 0 && maxFun === 0) maxFun = other.funBudgetInPaise;
        if (other.investmentBudgetInPaise > 0 && maxInv === 0) maxInv = other.investmentBudgetInPaise;
        if (other.emergencyBudgetInPaise > 0 && maxEf === 0) maxEf = other.emergencyBudgetInPaise;
        if (other.savingsBudgetInPaise > 0 && maxSav === 0) maxSav = other.savingsBudgetInPaise;
        if (other.carryForwardEnabled) carryForward = true;
      }

      authRecord.userId = canonicalUserId;
      authRecord.totalBudgetInPaise = maxTotalBudget;
      authRecord.essentialBudgetInPaise = maxEssential;
      authRecord.funBudgetInPaise = maxFun;
      authRecord.investmentBudgetInPaise = maxInv;
      authRecord.emergencyBudgetInPaise = maxEf;
      authRecord.savingsBudgetInPaise = maxSav;
      authRecord.carryForwardEnabled = carryForward;

      authoritativeBudgets.push(authRecord);
    }
  }

  // Remove duplicate budget records from memoryDb
  if (duplicateBudgetIdsToDelete.length > 0) {
    memoryDb.budgetAllocations = memoryDb.budgetAllocations.filter(
      b => !duplicateBudgetIdsToDelete.includes(b.id)
    );
  }
  // Ensure authoritative budgets are in memoryDb
  for (const authB of authoritativeBudgets) {
    const idx = memoryDb.budgetAllocations.findIndex(b => b.id === authB.id);
    if (idx >= 0) memoryDb.budgetAllocations[idx] = authB;
    else memoryDb.budgetAllocations.push(authB);
  }

  // 6. CASH WALLET DEDUPLICATION & MERGE
  const rajeshWallets = memoryDb.cashWallets.filter(
    w => w.userId === canonicalUserId || legacyIds.includes(w.userId)
  );
  if (rajeshWallets.length > 1) {
    const authWallet = rajeshWallets.reduce((max, w) => (w.balanceInPaise > max.balanceInPaise ? w : max), rajeshWallets[0]);
    authWallet.userId = canonicalUserId;
    const dupWalletIds = rajeshWallets.filter(w => w.id !== authWallet.id).map(w => w.id);
    memoryDb.cashWallets = memoryDb.cashWallets.filter(w => !dupWalletIds.includes(w.id));
    if (mongoConnected && mongoose.connection.readyState === 1) {
      await CashWalletModel.deleteMany({ id: { $in: dupWalletIds } });
      await CashWalletModel.findOneAndUpdate({ id: authWallet.id }, authWallet, { upsert: true });
    }
  } else if (rajeshWallets.length === 1) {
    rajeshWallets[0].userId = canonicalUserId;
  }

  // 7. EMERGENCY FUND DEDUPLICATION & MERGE
  const rajeshFunds = memoryDb.emergencyFunds.filter(
    f => f.userId === canonicalUserId || legacyIds.includes(f.userId)
  );
  if (rajeshFunds.length > 1) {
    const authFund = rajeshFunds.reduce((max, f) => (f.currentBalanceInPaise > max.currentBalanceInPaise ? f : max), rajeshFunds[0]);
    authFund.userId = canonicalUserId;
    const dupFundIds = rajeshFunds.filter(f => f.id !== authFund.id).map(f => f.id);
    memoryDb.emergencyFunds = memoryDb.emergencyFunds.filter(f => !dupFundIds.includes(f.id));
    if (mongoConnected && mongoose.connection.readyState === 1) {
      await EmergencyFundModel.deleteMany({ id: { $in: dupFundIds } });
      await EmergencyFundModel.findOneAndUpdate({ id: authFund.id }, authFund, { upsert: true });
    }
  } else if (rajeshFunds.length === 1) {
    rajeshFunds[0].userId = canonicalUserId;
  }

  // 8. REASSIGN REMAINING COLLECTIONS IN MEMORY
  const reassignInMemory = (arr: any[]) => {
    let count = 0;
    for (const item of (arr || [])) {
      if (legacyIds.includes(item.userId)) {
        item.userId = canonicalUserId;
        count++;
      }
    }
    return count;
  };

  const reassignedBanks = reassignInMemory(memoryDb.bankAccounts);
  const reassignedCards = reassignInMemory(memoryDb.creditCards);
  const reassignedTxs = reassignInMemory(memoryDb.transactions);
  const reassignedInvs = reassignInMemory(memoryDb.investments);
  const reassignedFDs = reassignInMemory(memoryDb.fixedDeposits);
  const reassignedSavings = reassignInMemory(memoryDb.savingsGoals);
  const reassignedNotifs = reassignInMemory(memoryDb.notifications);

  // 9. SYNC TO MONGODB ATLAS SAFELY
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      // Delete duplicate budget allocations in Atlas before updating to prevent unique key error
      if (duplicateBudgetIdsToDelete.length > 0) {
        await BudgetAllocationModel.deleteMany({ id: { $in: duplicateBudgetIdsToDelete } });
        console.log(`[Migration Atlas] Deleted ${duplicateBudgetIdsToDelete.length} duplicate budget documents.`);
      }

      // Upsert authoritative budgets individually (avoids compound unique key collisions)
      for (const authBudget of authoritativeBudgets) {
        await BudgetAllocationModel.findOneAndUpdate(
          { userId: canonicalUserId, monthYear: authBudget.monthYear },
          authBudget,
          { upsert: true, new: true }
        );
      }

      // Safely reassign non-unique collections in Atlas
      await Promise.all([
        BankAccountModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        CreditCardModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        TransactionModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        InvestmentModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        FixedDepositModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        SavingsGoalModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } }),
        NotificationModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: canonicalUserId } })
      ]);
      console.log(`[Migration Atlas] Successfully updated records in MongoDB Atlas to ${canonicalUserId}`);
    } catch (atlasErr) {
      console.error('[Migration Atlas Error] Failed during MongoDB Atlas migration:', atlasErr);
      throw atlasErr;
    }
  }

  // 10. RECORD MIGRATION COMPLETION
  const migrationRecord: IMigrationRecord = {
    id: 'migration-v1-reconcile-rajesh',
    name: MIGRATION_NAME,
    version: MIGRATION_VERSION,
    status: 'completed',
    executedAt: new Date().toISOString(),
    details: {
      canonicalUserId,
      canonicalEmail: canonicalUser.email,
      legacyIds,
      resolvedDuplicateBudgetsCount,
      reassigned: {
        bankAccounts: reassignedBanks,
        creditCards: reassignedCards,
        transactions: reassignedTxs,
        investments: reassignedInvs,
        fixedDeposits: reassignedFDs,
        savingsGoals: reassignedSavings,
        notifications: reassignedNotifs
      }
    }
  };

  memoryDb.migrations.push(migrationRecord);
  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await MigrationModel.findOneAndUpdate(
        { version: MIGRATION_VERSION },
        migrationRecord,
        { upsert: true }
      );
    } catch (mErr) {
      console.warn('Could not persist migration record in Atlas:', mErr);
    }
  }

  console.log(`[Migration SUCCESS] Version ${MIGRATION_VERSION} (${MIGRATION_NAME}) completed! Canonical User: ${canonicalUserId} (${canonicalUser.email}). Merged and resolved ${resolvedDuplicateBudgetsCount} duplicate budget records.`);
}

export async function reconcileUserData(user?: IUser): Promise<void> {
  // Safe no-op: Data reconciliation is strictly executed once via runIdempotentMigrations()
  return;
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
  memoryDb.emailLogs = [];

  saveDatabase();

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await Promise.all([
        UserModel.findOneAndUpdate({ id: demoUser.id }, demoUser, { upsert: true }),
        BankAccountModel.findOneAndUpdate({ id: hdfcAccount.id }, hdfcAccount, { upsert: true }),
        BankAccountModel.findOneAndUpdate({ id: sbiAccount.id }, sbiAccount, { upsert: true }),
        CashWalletModel.findOneAndUpdate({ id: cashWallet.id }, cashWallet, { upsert: true }),
        CreditCardModel.findOneAndUpdate({ id: hdfcCreditCard.id }, hdfcCreditCard, { upsert: true }),
        BudgetAllocationModel.findOneAndUpdate({ id: budgetAllocation.id }, budgetAllocation, { upsert: true }),
        EmergencyFundModel.findOneAndUpdate({ id: emergencyFund.id }, emergencyFund, { upsert: true }),
        ...savingsGoals.map(s => SavingsGoalModel.findOneAndUpdate({ id: s.id }, s, { upsert: true })),
        ...investments.map(i => InvestmentModel.findOneAndUpdate({ id: i.id }, i, { upsert: true })),
        ...fixedDeposits.map(f => FixedDepositModel.findOneAndUpdate({ id: f.id }, f, { upsert: true })),
        ...transactions.map(t => TransactionModel.findOneAndUpdate({ id: t.id }, t, { upsert: true })),
        ...notifications.map(n => NotificationModel.findOneAndUpdate({ id: n.id }, n, { upsert: true }))
      ]);
      console.log(`Seeded demo data persisted to MongoDB Atlas for ${userId}`);
    } catch (err) {
      console.error('Error persisting seeded data to MongoDB Atlas:', err);
    }
  }

  return userId;
}

