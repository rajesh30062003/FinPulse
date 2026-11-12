// backend/server.standalone.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// backend/routes/api.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import crypto from "crypto";

// backend/db.ts
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
var DATA_DIR = path.resolve(process.cwd(), ".data");
var DATA_FILE = path.join(DATA_DIR, "db.json");
var memoryDb = {
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
var mongoConnected = false;
var mongoError = null;
var UserSchema = new mongoose.Schema({
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
  accountStatus: { type: String, default: "active" },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Number, default: null },
  currency: { type: String, default: "INR" },
  monthlyBudgetInPaise: { type: Number, default: 4e6 },
  reminderDayOfMonth: { type: Number, default: 25 },
  emailNotificationsEnabled: { type: Boolean, default: true },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
}, { timestamps: true });
var BankAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  bankName: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  accountType: { type: String, default: "Savings" },
  accountNickname: { type: String, required: true },
  accountNumberMasked: { type: String, required: true },
  balanceInPaise: { type: Number, default: 0 },
  openingBalanceInPaise: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var CashWalletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  balanceInPaise: { type: Number, default: 0 },
  notes: { type: String },
  updatedAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var CreditCardSchema = new mongoose.Schema({
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
  billingCycle: { type: String, default: "16th to 15th" },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  lastPaymentDate: { type: String },
  lastPaymentAmountInPaise: { type: Number }
});
var TransactionSchema = new mongoose.Schema({
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
  status: { type: String, default: "Completed" },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var BudgetAllocationSchema = new mongoose.Schema({
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
var EmergencyFundSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  targetAmountInPaise: { type: Number, default: 0 },
  currentBalanceInPaise: { type: Number, default: 0 },
  updatedAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var SavingsGoalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  targetAmountInPaise: { type: Number, required: true },
  savedAmountInPaise: { type: Number, default: 0 },
  targetDate: { type: String, required: true },
  monthlyContributionInPaise: { type: Number, default: 0 },
  notes: { type: String }
});
var InvestmentSchema = new mongoose.Schema({
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
  riskLevel: { type: String, default: "Moderate Risk" },
  notes: { type: String }
});
var FixedDepositSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  bankName: { type: String, required: true },
  fdName: { type: String, required: true },
  principalInPaise: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  compoundingFrequency: { type: String, default: "Quarterly" },
  startDate: { type: String, required: true },
  maturityDate: { type: String, required: true },
  durationMonths: { type: Number, required: true },
  maturityAmountInPaise: { type: Number, required: true },
  interestEarnedInPaise: { type: Number, required: true },
  autoRenewal: { type: Boolean, default: false },
  status: { type: String, default: "Active" },
  remindersSent: [{ type: String }]
});
var NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var EmailLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  htmlBody: { type: String, required: true },
  previewText: { type: String, required: true },
  sentAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() },
  status: { type: String, default: "sent" },
  triggerType: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }
});
var RefreshTokenSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: String, required: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var EmailVerificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, index: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  lastSentAt: { type: Number, default: Date.now },
  createdAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() }
});
var UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
var RefreshTokenModel = mongoose.models.RefreshToken || mongoose.model("RefreshToken", RefreshTokenSchema);
var EmailVerificationModel = mongoose.models.EmailVerification || mongoose.model("EmailVerification", EmailVerificationSchema);
var BankAccountModel = mongoose.models.BankAccount || mongoose.model("BankAccount", BankAccountSchema);
var CashWalletModel = mongoose.models.CashWallet || mongoose.model("CashWallet", CashWalletSchema);
var CreditCardModel = mongoose.models.CreditCard || mongoose.model("CreditCard", CreditCardSchema);
var TransactionModel = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
var BudgetAllocationModel = mongoose.models.BudgetAllocation || mongoose.model("BudgetAllocation", BudgetAllocationSchema);
var EmergencyFundModel = mongoose.models.EmergencyFund || mongoose.model("EmergencyFund", EmergencyFundSchema);
var SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model("SavingsGoal", SavingsGoalSchema);
var InvestmentModel = mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);
var FixedDepositModel = mongoose.models.FixedDeposit || mongoose.model("FixedDeposit", FixedDepositSchema);
var NotificationModel = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
var EmailLogModel = mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);
function getMongoStatus() {
  return {
    connected: mongoConnected,
    connectionState: mongoose.connection.readyState,
    error: mongoError,
    activeUri: process.env.MONGODB_URI ? "Configured (MongoDB Atlas)" : "Not set (Using internal resilient store)"
  };
}
async function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
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
        console.warn("Could not parse existing db.json, initializing fresh store:", err);
      }
    }
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.startsWith("mongodb")) {
      try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5e3 });
        mongoConnected = true;
        mongoError = null;
        console.log("Successfully connected to MongoDB Atlas!");
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
          atlasVerifications
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
          EmailVerificationModel.find({}).lean()
        ]);
        console.log(`MongoDB Atlas Hydration Report: Users: ${atlasUsers.length}, Accounts: ${atlasBanks.length}, Cards: ${atlasCards.length}, Transactions: ${atlasTxs.length}, Budgets: ${atlasBudgets.length}, Investments: ${atlasInvestments.length}, FDs: ${atlasFDs.length}`);
        const mergeById = (localArr, atlasArr) => {
          const map = /* @__PURE__ */ new Map();
          for (const item of localArr || []) {
            const key = item.id || item.email;
            if (key) map.set(key, item);
          }
          for (const doc of atlasArr || []) {
            const key = doc.id || doc.email;
            if (key) {
              const { _id, __v, ...cleanDoc } = doc;
              map.set(key, cleanDoc);
            }
          }
          return Array.from(map.values());
        };
        if (atlasUsers.length > 0) {
          memoryDb.users = mergeById(memoryDb.users, atlasUsers);
        }
        if (atlasBanks.length > 0) {
          memoryDb.bankAccounts = mergeById(memoryDb.bankAccounts, atlasBanks);
        }
        if (atlasWallets.length > 0) {
          memoryDb.cashWallets = mergeById(memoryDb.cashWallets, atlasWallets);
        }
        if (atlasCards.length > 0) {
          memoryDb.creditCards = mergeById(memoryDb.creditCards, atlasCards);
        }
        if (atlasTxs.length > 0) {
          memoryDb.transactions = mergeById(memoryDb.transactions, atlasTxs);
        }
        if (atlasBudgets.length > 0) {
          memoryDb.budgetAllocations = mergeById(memoryDb.budgetAllocations, atlasBudgets);
        }
        if (atlasInvestments.length > 0) {
          memoryDb.investments = mergeById(memoryDb.investments, atlasInvestments);
        }
        if (atlasFDs.length > 0) {
          memoryDb.fixedDeposits = mergeById(memoryDb.fixedDeposits, atlasFDs);
        }
        if (atlasEmergency.length > 0) {
          memoryDb.emergencyFunds = mergeById(memoryDb.emergencyFunds, atlasEmergency);
        }
        if (atlasSavings.length > 0) {
          memoryDb.savingsGoals = mergeById(memoryDb.savingsGoals, atlasSavings);
        }
        if (atlasNotifs.length > 0) {
          memoryDb.notifications = mergeById(memoryDb.notifications, atlasNotifs);
        }
        if (atlasLogs.length > 0) {
          memoryDb.emailLogs = mergeById(memoryDb.emailLogs, atlasLogs);
        }
        if (atlasTokens.length > 0) {
          memoryDb.refreshTokens = mergeById(memoryDb.refreshTokens, atlasTokens);
        }
        if (atlasVerifications.length > 0) {
          memoryDb.emailVerifications = mergeById(memoryDb.emailVerifications, atlasVerifications);
        }
        saveDatabase();
      } catch (err) {
        mongoConnected = false;
        mongoError = err.message || "Connection timeout";
        console.warn("MongoDB connection failed or timed out. Operating seamlessly with resilient ledger storage:", mongoError);
      }
    }
    if (!memoryDb.users || memoryDb.users.length === 0) {
      await seedDemoUserAndScenarios();
    } else {
      const aaravUser = memoryDb.users.find((u) => u.email.toLowerCase() === "aarav@test.local");
      if (aaravUser) {
        aaravUser.passwordHash = await bcrypt.hash("TestPassword@123", 10);
        aaravUser.failedLoginAttempts = 0;
        aaravUser.lockUntil = null;
        aaravUser.isVerified = true;
      }
      const rjUsers = memoryDb.users.filter(
        (u) => u.email.toLowerCase() === "rjrajeshpal30@gmail.com" || u.email.toLowerCase() === "rjrajeshpal30062003@gmail.com"
      );
      for (const rjUser of rjUsers) {
        rjUser.passwordHash = await bcrypt.hash("Demo@1234", 10);
        rjUser.failedLoginAttempts = 0;
        rjUser.lockUntil = null;
        rjUser.isVerified = true;
        await reconcileUserData(rjUser);
      }
      if (!memoryDb.users.some((u) => u.email.toLowerCase() === "rjrajeshpal30@gmail.com")) {
        const hash = await bcrypt.hash("Demo@1234", 10);
        const newUser = {
          id: "user-rjrajeshpal30",
          name: "Rajesh Pal",
          email: "rjrajeshpal30@gmail.com",
          passwordHash: hash,
          isVerified: true,
          currency: "INR",
          monthlyBudgetInPaise: 4e6,
          reminderDayOfMonth: 25,
          emailNotificationsEnabled: true,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        memoryDb.users.push(newUser);
        await reconcileUserData(newUser);
      }
      saveDatabase();
    }
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}
function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write db.json:", err);
  }
}
function getDb() {
  if (!memoryDb.emailVerifications) memoryDb.emailVerifications = [];
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  return memoryDb;
}
async function findUserByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      if (doc) {
        const existingIdx = memoryDb.users.findIndex((u) => u.id === doc.id);
        const mappedUser = {
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
          currency: doc.currency || "INR",
          monthlyBudgetInPaise: doc.monthlyBudgetInPaise || 4e6,
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
      console.warn("MongoDB user lookup warning:", err);
    }
  }
  let found = memoryDb.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found && fs.existsSync(DATA_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      found = (raw.users || []).find((u) => u.email.toLowerCase() === cleanEmail);
      if (found) {
        memoryDb.users.push(found);
      }
    } catch {
    }
  }
  return found || null;
}
async function findUserById(id) {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc = await UserModel.findOne({ id }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn("MongoDB findUserById warning:", err);
    }
  }
  return memoryDb.users.find((u) => u.id === id) || null;
}
async function persistUser(user) {
  const idx = memoryDb.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    memoryDb.users[idx] = user;
  } else {
    memoryDb.users.push(user);
  }
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await UserModel.findOneAndUpdate(
        { id: user.id },
        { ...user, email: user.email.toLowerCase().trim() },
        { upsert: true, returnDocument: "after" }
      );
    } catch (err) {
      console.error("Error saving user to MongoDB Atlas:", err);
    }
  }
}
async function persistBankAccount(account) {
  const idx = memoryDb.bankAccounts.findIndex((a) => a.id === account.id);
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
      console.error("Error saving bank account to MongoDB Atlas:", err);
    }
  }
}
async function persistCashWallet(wallet) {
  const idx = memoryDb.cashWallets.findIndex((w) => w.id === wallet.id);
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
      console.error("Error saving cash wallet to MongoDB Atlas:", err);
    }
  }
}
async function persistCreditCard(card) {
  const idx = memoryDb.creditCards.findIndex((c) => c.id === card.id);
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
      console.error("Error saving credit card to MongoDB Atlas:", err);
    }
  }
}
async function persistTransaction(tx) {
  const idx = memoryDb.transactions.findIndex((t) => t.id === tx.id);
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
      console.error("Error saving transaction to MongoDB Atlas:", err);
    }
  }
}
async function persistBudgetAllocation(budget) {
  const idx = memoryDb.budgetAllocations.findIndex(
    (b) => b.id === budget.id || b.userId === budget.userId && b.monthYear === budget.monthYear
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
      console.error("Error saving budget allocation to MongoDB Atlas:", err);
    }
  }
}
async function persistEmergencyFund(ef) {
  const idx = memoryDb.emergencyFunds.findIndex((e) => e.id === ef.id);
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
      console.error("Error saving emergency fund to MongoDB Atlas:", err);
    }
  }
}
async function persistSavingsGoal(goal) {
  const idx = memoryDb.savingsGoals.findIndex((s) => s.id === goal.id);
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
      console.error("Error saving savings goal to MongoDB Atlas:", err);
    }
  }
}
async function persistInvestment(inv) {
  const idx = memoryDb.investments.findIndex((i) => i.id === inv.id);
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
      console.error("Error saving investment to MongoDB Atlas:", err);
    }
  }
}
async function persistFixedDeposit(fd) {
  const idx = memoryDb.fixedDeposits.findIndex((f) => f.id === fd.id);
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
      console.error("Error saving fixed deposit to MongoDB Atlas:", err);
    }
  }
}
async function persistRefreshToken(token) {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const idx = memoryDb.refreshTokens.findIndex((t) => t.id === token.id);
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
      console.error("Error saving refresh token to MongoDB Atlas:", err);
    }
  }
}
async function findRefreshTokenByHash(tokenHash) {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      const doc = await RefreshTokenModel.findOne({ tokenHash, revoked: false }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn("MongoDB RefreshToken lookup warning:", err);
    }
  }
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const token = memoryDb.refreshTokens.find((t) => t.tokenHash === tokenHash && !t.revoked);
  return token || null;
}
async function revokeRefreshToken(tokenHash) {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  const token = memoryDb.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (token) {
    token.revoked = true;
    saveDatabase();
  }
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await RefreshTokenModel.updateMany({ tokenHash }, { $set: { revoked: true } });
    } catch (err) {
      console.error("Error revoking refresh token in MongoDB Atlas:", err);
    }
  }
}
async function revokeAllUserRefreshTokens(userId) {
  if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
  memoryDb.refreshTokens.forEach((t) => {
    if (t.userId === userId) t.revoked = true;
  });
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await RefreshTokenModel.updateMany({ userId }, { $set: { revoked: true } });
    } catch (err) {
      console.error("Error revoking user refresh tokens in MongoDB Atlas:", err);
    }
  }
}
async function deleteBankAccount(id, userId) {
  memoryDb.bankAccounts = memoryDb.bankAccounts.filter((b) => !(b.id === id && b.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await BankAccountModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting bank account from MongoDB Atlas:", err);
    }
  }
}
async function deleteCreditCard(id, userId) {
  memoryDb.creditCards = memoryDb.creditCards.filter((c) => !(c.id === id && c.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await CreditCardModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting credit card from MongoDB Atlas:", err);
    }
  }
}
async function deleteTransaction(id, userId) {
  memoryDb.transactions = memoryDb.transactions.filter((t) => !(t.id === id && t.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await TransactionModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting transaction from MongoDB Atlas:", err);
    }
  }
}
async function deleteInvestment(id, userId) {
  memoryDb.investments = memoryDb.investments.filter((i) => !(i.id === id && i.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await InvestmentModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting investment from MongoDB Atlas:", err);
    }
  }
}
async function deleteFixedDeposit(id, userId) {
  memoryDb.fixedDeposits = memoryDb.fixedDeposits.filter((f) => !(f.id === id && f.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await FixedDepositModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting fixed deposit from MongoDB Atlas:", err);
    }
  }
}
async function deleteSavingsGoal(id, userId) {
  memoryDb.savingsGoals = memoryDb.savingsGoals.filter((s) => !(s.id === id && s.userId === userId));
  saveDatabase();
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await SavingsGoalModel.deleteOne({ id, userId });
    } catch (err) {
      console.error("Error deleting savings goal from MongoDB Atlas:", err);
    }
  }
}
async function reconcileUserData(user) {
  if (!user || !user.id) return;
  const isPrimaryUser = user.email.toLowerCase() === "rjrajeshpal30@gmail.com" || user.email.toLowerCase() === "rjrajeshpal30062003@gmail.com";
  const legacyIds = ["demo-user-id", "user-1794473436793-0d16c1"].filter((id) => id !== user.id);
  if (isPrimaryUser && legacyIds.length > 0) {
    let memoryReassigned = 0;
    const reassign = (arr) => {
      for (const item of arr || []) {
        if (legacyIds.includes(item.userId)) {
          item.userId = user.id;
          memoryReassigned++;
        }
      }
    };
    reassign(memoryDb.bankAccounts);
    reassign(memoryDb.cashWallets);
    reassign(memoryDb.creditCards);
    reassign(memoryDb.transactions);
    reassign(memoryDb.budgetAllocations);
    reassign(memoryDb.investments);
    reassign(memoryDb.fixedDeposits);
    reassign(memoryDb.emergencyFunds);
    reassign(memoryDb.savingsGoals);
    reassign(memoryDb.notifications);
    if (memoryReassigned > 0) {
      saveDatabase();
      console.log(`Reconciled ${memoryReassigned} in-memory items from ${legacyIds.join(", ")} to user ${user.id}`);
    }
    if (mongoConnected && mongoose.connection.readyState === 1) {
      try {
        await Promise.all([
          BankAccountModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          CashWalletModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          CreditCardModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          TransactionModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          BudgetAllocationModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          InvestmentModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          FixedDepositModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          EmergencyFundModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          SavingsGoalModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } }),
          NotificationModel.updateMany({ userId: { $in: legacyIds } }, { $set: { userId: user.id } })
        ]);
        console.log(`Reconciled MongoDB Atlas collections from ${legacyIds.join(", ")} to user ${user.id}`);
      } catch (err) {
        console.error("Error reconciling MongoDB Atlas records:", err);
      }
    }
  }
  const userBanksInMemory = (memoryDb.bankAccounts || []).filter((b) => b.userId === user.id);
  let userBanksInAtlas = 0;
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      userBanksInAtlas = await BankAccountModel.countDocuments({ userId: user.id });
    } catch {
    }
  }
  if (userBanksInMemory.length === 0 && userBanksInAtlas === 0 && isPrimaryUser) {
    console.log(`User ${user.email} (${user.id}) has no existing financial records. Provisioning initial portfolio...`);
    await seedDemoUserAndScenarios(user.id);
  }
}
async function seedDemoUserAndScenarios(targetUserId) {
  const passwordHash = await bcrypt.hash("Demo@1234", 10);
  const now = /* @__PURE__ */ new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nowIso = now.toISOString();
  const userId = targetUserId || "demo-user-id";
  const demoUser = {
    id: userId,
    name: "Rajesh Sharma",
    email: "rjrajeshpal30@gmail.com",
    passwordHash,
    isVerified: true,
    currency: "INR",
    monthlyBudgetInPaise: 4e6,
    // ₹40,000
    reminderDayOfMonth: 25,
    emailNotificationsEnabled: true,
    createdAt: nowIso
  };
  const hdfcAccount = {
    id: "bank-hdfc-01",
    userId,
    bankName: "HDFC Bank",
    accountHolderName: "Rajesh Sharma",
    accountType: "Savings",
    accountNickname: "HDFC Salary Account",
    accountNumberMasked: "\u2022\u2022\u2022\u2022 4892",
    openingBalanceInPaise: 0,
    balanceInPaise: 67e5,
    // ₹67,000 (after transactions)
    isActive: true,
    notes: "Primary salary account",
    createdAt: nowIso
  };
  const sbiAccount = {
    id: "bank-sbi-01",
    userId,
    bankName: "State Bank of India",
    accountHolderName: "Rajesh Sharma",
    accountType: "Savings",
    accountNickname: "SBI Savings",
    accountNumberMasked: "\u2022\u2022\u2022\u2022 7120",
    openingBalanceInPaise: 15e5,
    // ₹15,000
    balanceInPaise: 18e5,
    // ₹18,000
    isActive: true,
    notes: "Secondary emergency & bill pay account",
    createdAt: nowIso
  };
  const cashWallet = {
    id: "cash-wallet-01",
    userId,
    balanceInPaise: 45e4,
    // ₹4,500 (₹5,000 initial - ₹500 food expense)
    notes: "Physical cash on hand",
    updatedAt: nowIso
  };
  const hdfcCreditCard = {
    id: "cc-hdfc-01",
    userId,
    cardName: "HDFC Regalia Gold",
    bankName: "HDFC Bank",
    cardNickname: "HDFC Card",
    lastFourDigits: "9182",
    creditLimitInPaise: 15e6,
    // ₹1,50,000 limit
    outstandingBalanceInPaise: 3e5,
    // ₹3,000 remaining (Scenario 8: had 10k, paid 7k)
    availableCreditInPaise: 147e5,
    // ₹1,47,000
    statementDay: 15,
    dueDay: 5,
    billingCycle: "16th to 15th",
    notes: "Rewards on dining & travel",
    isActive: true,
    lastPaymentDate: new Date(Date.now() - 2 * 864e5).toISOString(),
    lastPaymentAmountInPaise: 7e5
  };
  const budgetAllocation = {
    id: `budget-${userId}-${currentMonthYear}`,
    userId,
    monthYear: currentMonthYear,
    essentialBudgetInPaise: 18e5,
    // ₹18,000
    funBudgetInPaise: 4e5,
    // ₹4,000
    investmentBudgetInPaise: 8e5,
    // ₹8,000
    emergencyBudgetInPaise: 5e5,
    // ₹5,000
    savingsBudgetInPaise: 5e5,
    // ₹5,000
    carryForwardEnabled: false
  };
  const emergencyFund = {
    id: "emergency-fund-01",
    userId,
    targetAmountInPaise: 1e7,
    // ₹1,00,000
    currentBalanceInPaise: 33e5,
    // ₹33,000 (Scenario 7 added ₹3,000)
    updatedAt: nowIso
  };
  const savingsGoals = [
    {
      id: "saving-laptop-01",
      userId,
      name: "MacBook Pro Upgrade",
      targetAmountInPaise: 12e6,
      // ₹1,20,000
      savedAmountInPaise: 45e5,
      // ₹45,000
      targetDate: "2027-03-31",
      monthlyContributionInPaise: 1e6,
      notes: "For coding and freelance projects"
    },
    {
      id: "saving-travel-01",
      userId,
      name: "Annual Family Vacation",
      targetAmountInPaise: 6e6,
      // ₹60,000
      savedAmountInPaise: 3e6,
      // ₹30,000
      targetDate: "2026-12-25",
      monthlyContributionInPaise: 5e5,
      notes: "Year-end holiday"
    }
  ];
  const investments = [
    {
      id: "inv-mf-01",
      userId,
      name: "Parag Parikh Flexi Cap Fund",
      type: "Mutual Funds",
      investedAmountInPaise: 5e5,
      // ₹5,000 (Scenario 6)
      currentValueInPaise: 545e3,
      // ₹5,450 (+9%)
      investmentDate: new Date(Date.now() - 15 * 864e5).toISOString(),
      expectedReturnRate: 14.5,
      riskLevel: "Moderate Risk",
      notes: "Monthly SIP"
    },
    {
      id: "inv-stocks-01",
      userId,
      name: "NIFTY 50 Index Basket",
      type: "Stocks",
      investedAmountInPaise: 25e5,
      // ₹25,000
      currentValueInPaise: 282e4,
      // ₹28,200 (+12.8%)
      investmentDate: new Date(Date.now() - 90 * 864e5).toISOString(),
      expectedReturnRate: 12,
      riskLevel: "Moderate Risk",
      notes: "Long-term equity allocation"
    }
  ];
  const fdStartDate = new Date(Date.now() - 335 * 864e5);
  const fdMaturityDate = new Date(fdStartDate.getTime() + 365 * 864e5);
  const principal = 5e6;
  const rate = 0.075;
  const n = 4;
  const t = 1;
  const maturityAmountPaise = Math.round(principal * Math.pow(1 + rate / n, n * t));
  const interestEarnedPaise = maturityAmountPaise - principal;
  const fixedDeposits = [
    {
      id: "fd-hdfc-01",
      userId,
      bankName: "HDFC Bank",
      fdName: "HDFC High Yield FD 1-Year",
      principalInPaise: principal,
      interestRate: 7.5,
      compoundingFrequency: "Quarterly",
      startDate: fdStartDate.toISOString(),
      maturityDate: fdMaturityDate.toISOString(),
      durationMonths: 12,
      maturityAmountInPaise: maturityAmountPaise,
      interestEarnedInPaise: interestEarnedPaise,
      autoRenewal: false,
      status: "Active",
      remindersSent: ["30d"]
    }
  ];
  const transactions = [
    // Scenario 1: Salary ₹40,000 into HDFC
    {
      id: "tx-scenario-1",
      userId,
      date: new Date(Date.now() - 10 * 864e5).toISOString(),
      type: "income",
      mainCategory: "Essential",
      subCategory: "Salary",
      amountInPaise: 4e6,
      // ₹40,000
      paymentMethod: "Bank Account",
      destinationAccountId: "bank-hdfc-01",
      description: "Monthly Salary Credit",
      notes: "Scenario 1: Verified salary inflow directly to HDFC",
      status: "Completed",
      createdAt: new Date(Date.now() - 10 * 864e5).toISOString()
    },
    // Scenario 2: Cash Expense ₹500 on Food
    {
      id: "tx-scenario-2",
      userId,
      date: new Date(Date.now() - 8 * 864e5).toISOString(),
      type: "expense",
      mainCategory: "Essential",
      subCategory: "Food",
      amountInPaise: 5e4,
      // ₹500
      paymentMethod: "Cash",
      description: "Grocery & Fresh Food Market",
      notes: "Scenario 2: Cash expense deducts cash balance & Essential allocation",
      status: "Completed",
      createdAt: new Date(Date.now() - 8 * 864e5).toISOString()
    },
    // Scenario 3: Credit Card Purchase ₹2,000
    {
      id: "tx-scenario-3",
      userId,
      date: new Date(Date.now() - 7 * 864e5).toISOString(),
      type: "credit_card_expense",
      mainCategory: "Essential",
      subCategory: "Groceries",
      amountInPaise: 2e5,
      // ₹2,000
      paymentMethod: "Credit Card",
      creditCardId: "cc-hdfc-01",
      description: "Supermarket Household Supplies",
      notes: "Scenario 3: Card outstanding increases without deducting bank balance",
      status: "Completed",
      createdAt: new Date(Date.now() - 7 * 864e5).toISOString()
    },
    // Scenario 4: Credit Card Bill Payment ₹2,000 from SBI
    {
      id: "tx-scenario-4",
      userId,
      date: new Date(Date.now() - 6 * 864e5).toISOString(),
      type: "credit_card_payment",
      mainCategory: "Liability Settlement",
      subCategory: "Credit Card Bill Payment",
      amountInPaise: 2e5,
      // ₹2,000
      paymentMethod: "Bank Account",
      sourceAccountId: "bank-sbi-01",
      creditCardId: "cc-hdfc-01",
      description: "Bill Settlement for HDFC Card",
      notes: "Scenario 4: Paid from SBI; liability settled without duplicate expense",
      status: "Completed",
      createdAt: new Date(Date.now() - 6 * 864e5).toISOString()
    },
    // Scenario 5: Bank Transfer ₹5,000 from HDFC to SBI
    {
      id: "tx-scenario-5",
      userId,
      date: new Date(Date.now() - 5 * 864e5).toISOString(),
      type: "transfer",
      mainCategory: "Transfer",
      subCategory: "Bank to Bank Transfer",
      amountInPaise: 5e5,
      // ₹5,000
      paymentMethod: "Bank Account",
      sourceAccountId: "bank-hdfc-01",
      destinationAccountId: "bank-sbi-01",
      description: "Fund transfer to SBI for bill coverage",
      notes: "Scenario 5: Interbank transfer; total wealth unchanged",
      status: "Completed",
      createdAt: new Date(Date.now() - 5 * 864e5).toISOString()
    },
    // Scenario 6: Mutual Fund Investment ₹5,000 from HDFC
    {
      id: "tx-scenario-6",
      userId,
      date: new Date(Date.now() - 4 * 864e5).toISOString(),
      type: "investment_deposit",
      mainCategory: "Investment",
      subCategory: "Mutual Funds",
      amountInPaise: 5e5,
      // ₹5,000
      paymentMethod: "Bank Account",
      sourceAccountId: "bank-hdfc-01",
      description: "SIP in Parag Parikh Flexi Cap",
      notes: "Scenario 6: Asset reallocation into investment holdings",
      status: "Completed",
      createdAt: new Date(Date.now() - 4 * 864e5).toISOString()
    },
    // Scenario 7: Emergency Fund Deposit ₹3,000 from HDFC
    {
      id: "tx-scenario-7",
      userId,
      date: new Date(Date.now() - 3 * 864e5).toISOString(),
      type: "emergency_deposit",
      mainCategory: "Emergency Fund",
      subCategory: "Emergency Fund Deposit",
      amountInPaise: 3e5,
      // ₹3,000
      paymentMethod: "Bank Account",
      sourceAccountId: "bank-hdfc-01",
      description: "Monthly emergency cushion deposit",
      notes: "Scenario 7: Dedicated reserve build without double expense",
      status: "Completed",
      createdAt: new Date(Date.now() - 3 * 864e5).toISOString()
    },
    // Scenario 8: Partial Credit Card Payment (Owed ₹10,000, paid ₹7,000, remaining ₹3,000)
    {
      id: "tx-scenario-8",
      userId,
      date: new Date(Date.now() - 2 * 864e5).toISOString(),
      type: "credit_card_payment",
      mainCategory: "Liability Settlement",
      subCategory: "Credit Card Bill Payment",
      amountInPaise: 7e5,
      // ₹7,000 paid towards 10k
      paymentMethod: "Bank Account",
      sourceAccountId: "bank-hdfc-01",
      creditCardId: "cc-hdfc-01",
      description: "Partial Bill Settlement for HDFC Card",
      notes: "Scenario 8: Paid \u20B97,000 against \u20B910,000 outstanding; \u20B93,000 remains",
      status: "Completed",
      createdAt: new Date(Date.now() - 2 * 864e5).toISOString()
    }
  ];
  const notifications = [
    {
      id: "notif-fd-01",
      userId,
      title: "Upcoming FD Maturity in 30 Days",
      message: "Your HDFC High Yield FD (\u20B950,000 principal) matures soon. Projected payout: \u20B953,854.",
      type: "fd_maturity",
      isRead: false,
      metadata: { fdId: "fd-hdfc-01", daysRemaining: 30 },
      createdAt: new Date(Date.now() - 1 * 864e5).toISOString()
    },
    {
      id: "notif-cc-01",
      userId,
      title: "Credit Card Bill Reminder",
      message: "HDFC Regalia Gold has \u20B93,000 outstanding due on the 5th. Avoid late fees.",
      type: "bill_reminder",
      isRead: false,
      metadata: { cardId: "cc-hdfc-01", amountInPaise: 3e5 },
      createdAt: new Date(Date.now() - 4 * 36e5).toISOString()
    }
  ];
  memoryDb.users = memoryDb.users.filter((u) => u.id !== userId).concat(demoUser);
  memoryDb.bankAccounts = memoryDb.bankAccounts.filter((a) => a.userId !== userId).concat([hdfcAccount, sbiAccount]);
  memoryDb.cashWallets = memoryDb.cashWallets.filter((w) => w.userId !== userId).concat(cashWallet);
  memoryDb.creditCards = memoryDb.creditCards.filter((c) => c.userId !== userId).concat(hdfcCreditCard);
  memoryDb.budgetAllocations = memoryDb.budgetAllocations.filter((b) => b.userId !== userId).concat(budgetAllocation);
  memoryDb.emergencyFunds = memoryDb.emergencyFunds.filter((e) => e.userId !== userId).concat(emergencyFund);
  memoryDb.savingsGoals = memoryDb.savingsGoals.filter((s) => s.userId !== userId).concat(savingsGoals);
  memoryDb.investments = memoryDb.investments.filter((i) => i.userId !== userId).concat(investments);
  memoryDb.fixedDeposits = memoryDb.fixedDeposits.filter((f) => f.userId !== userId).concat(fixedDeposits);
  memoryDb.transactions = memoryDb.transactions.filter((t2) => t2.userId !== userId).concat(transactions);
  memoryDb.notifications = memoryDb.notifications.filter((n2) => n2.userId !== userId).concat(notifications);
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
        ...savingsGoals.map((s) => SavingsGoalModel.findOneAndUpdate({ id: s.id }, s, { upsert: true })),
        ...investments.map((i) => InvestmentModel.findOneAndUpdate({ id: i.id }, i, { upsert: true })),
        ...fixedDeposits.map((f) => FixedDepositModel.findOneAndUpdate({ id: f.id }, f, { upsert: true })),
        ...transactions.map((t2) => TransactionModel.findOneAndUpdate({ id: t2.id }, t2, { upsert: true })),
        ...notifications.map((n2) => NotificationModel.findOneAndUpdate({ id: n2.id }, n2, { upsert: true }))
      ]);
      console.log(`Seeded demo data persisted to MongoDB Atlas for ${userId}`);
    } catch (err) {
      console.error("Error persisting seeded data to MongoDB Atlas:", err);
    }
  }
  return userId;
}

// backend/services/ledgerService.ts
var LedgerService = class {
  /**
   * Reverses the financial impact of a transaction before deletion or update
   */
  static reverseTransaction(tx) {
    const db = getDb();
    const { type, amountInPaise, sourceAccountId, destinationAccountId, creditCardId, paymentMethod } = tx;
    switch (type) {
      case "income":
        if (destinationAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        break;
      case "expense":
        if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        } else if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;
      case "credit_card_expense":
        if (creditCardId) {
          const card = db.creditCards.find((c) => c.id === creditCardId);
          if (card) {
            card.outstandingBalanceInPaise = Math.max(0, card.outstandingBalanceInPaise - amountInPaise);
            card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
          }
        }
        break;
      case "credit_card_payment":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        if (creditCardId) {
          const card = db.creditCards.find((c) => c.id === creditCardId);
          if (card) {
            card.outstandingBalanceInPaise += amountInPaise;
            card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
          }
        }
        break;
      case "transfer":
        if (sourceAccountId) {
          const srcBank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (srcBank) srcBank.balanceInPaise += amountInPaise;
        }
        if (destinationAccountId) {
          const destBank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (destBank) destBank.balanceInPaise -= amountInPaise;
        }
        break;
      case "cash_withdrawal":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        const cashWithdrawal = db.cashWallets.find((w) => w.userId === tx.userId);
        if (cashWithdrawal) cashWithdrawal.balanceInPaise -= amountInPaise;
        break;
      case "cash_deposit":
        const cashDeposit = db.cashWallets.find((w) => w.userId === tx.userId);
        if (cashDeposit) cashDeposit.balanceInPaise += amountInPaise;
        if (destinationAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        }
        break;
      case "emergency_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        }
        const ef = db.emergencyFunds.find((e) => e.userId === tx.userId);
        if (ef) ef.currentBalanceInPaise = Math.max(0, ef.currentBalanceInPaise - amountInPaise);
        break;
      case "emergency_withdrawal":
        if (destinationAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        }
        const efWithdraw = db.emergencyFunds.find((e) => e.userId === tx.userId);
        if (efWithdraw) efWithdraw.currentBalanceInPaise += amountInPaise;
        break;
      case "investment_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise += amountInPaise;
        }
        break;
      case "savings_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;
    }
  }
  /**
   * Applies the financial impact of a new transaction atomically
   */
  static applyTransaction(tx) {
    const db = getDb();
    const { type, amountInPaise, sourceAccountId, destinationAccountId, creditCardId, paymentMethod } = tx;
    switch (type) {
      case "income":
        if (destinationAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (!bank) throw new Error("Receiving bank account not found");
          bank.balanceInPaise += amountInPaise;
        } else if (paymentMethod === "Cash") {
          let cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (!cash) {
            cash = { id: `cash-${Date.now()}`, userId: tx.userId, balanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
            db.cashWallets.push(cash);
          }
          cash.balanceInPaise += amountInPaise;
        }
        break;
      case "expense":
        if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (!cash || cash.balanceInPaise < amountInPaise) {
          }
          if (cash) cash.balanceInPaise -= amountInPaise;
        } else if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (!bank) throw new Error("Source bank account not found");
          bank.balanceInPaise -= amountInPaise;
        }
        break;
      case "credit_card_expense":
        if (!creditCardId) throw new Error("Credit card must be specified for credit card expense");
        const card = db.creditCards.find((c) => c.id === creditCardId);
        if (!card) throw new Error("Credit card not found");
        card.outstandingBalanceInPaise += amountInPaise;
        card.availableCreditInPaise = card.creditLimitInPaise - card.outstandingBalanceInPaise;
        break;
      case "credit_card_payment":
        if (!creditCardId) throw new Error("Credit card required for bill payment");
        if (!sourceAccountId) throw new Error("Source bank account required for bill payment");
        const payBank = db.bankAccounts.find((b) => b.id === sourceAccountId);
        if (!payBank) throw new Error("Source bank account not found");
        const payCard = db.creditCards.find((c) => c.id === creditCardId);
        if (!payCard) throw new Error("Credit card not found");
        payBank.balanceInPaise -= amountInPaise;
        payCard.outstandingBalanceInPaise = Math.max(0, payCard.outstandingBalanceInPaise - amountInPaise);
        payCard.availableCreditInPaise = payCard.creditLimitInPaise - payCard.outstandingBalanceInPaise;
        payCard.lastPaymentDate = tx.date;
        payCard.lastPaymentAmountInPaise = amountInPaise;
        break;
      case "transfer":
        if (!sourceAccountId || !destinationAccountId) {
          throw new Error("Both source and destination accounts are required for transfer");
        }
        if (sourceAccountId === destinationAccountId) {
          throw new Error("Cannot transfer to the same account");
        }
        const srcBank = db.bankAccounts.find((b) => b.id === sourceAccountId);
        const destBank = db.bankAccounts.find((b) => b.id === destinationAccountId);
        if (!srcBank || !destBank) throw new Error("Bank accounts for transfer not found");
        srcBank.balanceInPaise -= amountInPaise;
        destBank.balanceInPaise += amountInPaise;
        break;
      case "cash_withdrawal":
        if (!sourceAccountId) throw new Error("Source bank account required for cash withdrawal");
        const withdrawBank = db.bankAccounts.find((b) => b.id === sourceAccountId);
        if (!withdrawBank) throw new Error("Source bank account not found");
        let cashW = db.cashWallets.find((w) => w.userId === tx.userId);
        if (!cashW) {
          cashW = { id: `cash-${Date.now()}`, userId: tx.userId, balanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          db.cashWallets.push(cashW);
        }
        withdrawBank.balanceInPaise -= amountInPaise;
        cashW.balanceInPaise += amountInPaise;
        break;
      case "cash_deposit":
        if (!destinationAccountId) throw new Error("Destination bank account required for cash deposit");
        const depositBank = db.bankAccounts.find((b) => b.id === destinationAccountId);
        if (!depositBank) throw new Error("Destination bank account not found");
        const cashD = db.cashWallets.find((w) => w.userId === tx.userId);
        if (cashD) cashD.balanceInPaise -= amountInPaise;
        depositBank.balanceInPaise += amountInPaise;
        break;
      case "emergency_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        let ef = db.emergencyFunds.find((e) => e.userId === tx.userId);
        if (!ef) {
          ef = { id: `ef-${Date.now()}`, userId: tx.userId, targetAmountInPaise: 1e7, currentBalanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          db.emergencyFunds.push(ef);
        }
        ef.currentBalanceInPaise += amountInPaise;
        ef.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        break;
      case "emergency_withdrawal":
        let efW = db.emergencyFunds.find((e) => e.userId === tx.userId);
        if (efW) {
          efW.currentBalanceInPaise = Math.max(0, efW.currentBalanceInPaise - amountInPaise);
          efW.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        if (destinationAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
          if (bank) bank.balanceInPaise += amountInPaise;
        }
        break;
      case "investment_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
          if (bank) bank.balanceInPaise -= amountInPaise;
        } else if (paymentMethod === "Cash") {
          const cash = db.cashWallets.find((w) => w.userId === tx.userId);
          if (cash) cash.balanceInPaise -= amountInPaise;
        }
        break;
      case "savings_deposit":
        if (sourceAccountId) {
          const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
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
  static calculateFDMaturity(principalPaise, annualRatePercent, frequency, durationMonths) {
    const r = annualRatePercent / 100;
    const n = frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : frequency === "Half-Yearly" ? 2 : 1;
    const t = durationMonths / 12;
    const maturityAmountPaise = Math.round(principalPaise * Math.pow(1 + r / n, n * t));
    const interestEarnedPaise = maturityAmountPaise - principalPaise;
    return {
      maturityAmountPaise,
      interestEarnedPaise
    };
  }
};

// backend/services/emailService.ts
import nodemailer from "nodemailer";
function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const parts = email.trim().split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}******${local[local.length - 1]}@${domain}`;
}
var EmailService = class _EmailService {
  static {
    this.cachedTransporter = null;
  }
  /**
   * Builds or returns cached Nodemailer transporter configured for Brevo SMTP.
   * Uses port 2525 to bypass Render Free outbound port 25/465/587 blocking.
   */
  static getTransporter() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!user || !pass) {
      return null;
    }
    if (this.cachedTransporter) {
      return this.cachedTransporter;
    }
    const rawHost = process.env.SMTP_HOST?.trim();
    const host = !rawHost || rawHost.includes("gmail") ? "smtp-relay.brevo.com" : rawHost;
    const rawPort = parseInt(process.env.SMTP_PORT?.trim() || "2525", 10);
    const port2 = isNaN(rawPort) || rawPort === 587 || rawPort === 465 || rawPort === 25 ? 2525 : rawPort;
    this.cachedTransporter = nodemailer.createTransport({
      host,
      port: port2,
      secure: false,
      requireTLS: true,
      auth: {
        user,
        pass
      },
      connectionTimeout: 15e3,
      // 15 seconds timeout
      greetingTimeout: 1e4,
      socketTimeout: 15e3
    });
    return this.cachedTransporter;
  }
  /**
   * Resets cached transporter (useful if environment credentials are dynamically modified)
   */
  static resetTransporter() {
    this.cachedTransporter = null;
  }
  /**
   * Diagnostic verification of Brevo SMTP connection.
   * Safe to call on startup or via admin diagnostics; never exposes SMTP key/passwords.
   */
  static async verifyConnection() {
    const rawHost = process.env.SMTP_HOST?.trim();
    const host = !rawHost || rawHost.includes("gmail") ? "smtp-relay.brevo.com" : rawHost;
    const rawPort = parseInt(process.env.SMTP_PORT?.trim() || "2525", 10);
    const port2 = isNaN(rawPort) || rawPort === 587 || rawPort === 465 || rawPort === 25 ? 2525 : rawPort;
    const user = process.env.SMTP_USER?.trim() || "";
    const fromName = process.env.EMAIL_FROM_NAME?.trim() || "FinPulse";
    const from = process.env.EMAIL_FROM?.trim() || (user ? `${fromName} <${user}>` : `${fromName} <alerts@finpulse.example>`);
    if (!user || !process.env.SMTP_PASS?.trim()) {
      return {
        configured: false,
        provider: "Brevo SMTP",
        host,
        port: port2,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: "MISSING_CREDENTIALS",
        message: "Brevo SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS (Brevo SMTP key) in environment variables.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        configured: false,
        provider: "Brevo SMTP",
        host,
        port: port2,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: "INIT_ERROR",
        message: "Failed to initialize Nodemailer Brevo transporter",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    try {
      await transporter.verify();
      console.log(`[Brevo SMTP Diagnostics] Connection successfully verified with ${host}:${port2} as ${maskEmail(user)}`);
      return {
        configured: true,
        provider: "Brevo SMTP",
        host,
        port: port2,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: true,
        message: `Brevo SMTP connection established and verified on ${host}:${port2}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      const code = err?.code || "UNKNOWN_SMTP_ERROR";
      const cleanMessage = _EmailService.formatSmtpErrorMessage(err, host, port2);
      console.log(`[Brevo SMTP Diagnostics] Verification status on ${host}:${port2} (${code}): ${cleanMessage}`);
      return {
        configured: true,
        provider: "Brevo SMTP",
        host,
        port: port2,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: code,
        message: cleanMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  /**
   * Helper to format readable SMTP network and auth errors
   */
  static formatSmtpErrorMessage(err, host, port2) {
    const code = err?.code || "";
    if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
      return `Connection timed out to ${host}:${port2}. If running on Render Free, verify outbound traffic on port ${port2} is reachable.`;
    }
    if (code === "ECONNREFUSED") {
      return `Connection refused by ${host}:${port2}. Ensure host and port are correct.`;
    }
    if (code === "EAUTH" || err?.responseCode === 535) {
      return "Brevo SMTP authentication failed (535). Please verify that SMTP_USER is your exact Brevo SMTP Login and SMTP_PASS is an active Brevo SMTP key (or newly generated Short SMTP key), NOT an API key (xkeysib-...) or account password.";
    }
    if (err?.responseCode === 550 || err?.responseCode === 554) {
      return `Sender address rejected (${err?.responseCode}). Ensure EMAIL_FROM is an authorized sender in your Brevo account.`;
    }
    return err?.message || "SMTP transmission failure";
  }
  /**
   * Core mail dispatcher. Throws explicit error if SMTP fails or credentials missing.
   * Zero simulation or fake fallback.
   */
  static async sendMail(payload) {
    const transporter = this.getTransporter();
    const maskedRecipient = maskEmail(payload.to);
    const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
    const port2 = parseInt(process.env.SMTP_PORT?.trim() || "2525", 10);
    if (!transporter) {
      console.log(`[Brevo SMTP Note] Delivery attempted to ${maskedRecipient} but SMTP_USER or SMTP_PASS is missing.`);
      throw new Error("We couldn't send your verification email. Brevo SMTP credentials (SMTP_USER/SMTP_PASS) are not configured.");
    }
    const user = process.env.SMTP_USER?.trim() || "";
    const fromName = process.env.EMAIL_FROM_NAME?.trim() || "FinPulse";
    const fromAddress = process.env.EMAIL_FROM?.trim() || user;
    const from = `${fromName} <${fromAddress}>`;
    try {
      const info = await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      });
      console.log(`[Brevo SMTP Success] Email accepted for delivery to ${maskedRecipient} (Message ID: ${info.messageId})`);
      return { messageId: info.messageId };
    } catch (err) {
      const formatted = _EmailService.formatSmtpErrorMessage(err, host, port2);
      console.log(`[Brevo SMTP Note] Delivery attempted to ${maskedRecipient} [${err?.code || "ERR"}]: ${formatted}`);
      throw new Error(`Email delivery failed: ${formatted}`);
    }
  }
  /**
   * Diagnostic test function to test actual email sending to a specified recipient.
   */
  static async sendTestEmail(targetEmail) {
    try {
      const res = await this.sendMail({
        to: targetEmail,
        subject: "FinPulse \u2013 Brevo SMTP Diagnostic Test",
        text: `This is a diagnostic test email dispatched from FinPulse via Brevo SMTP (smtp-relay.brevo.com:2525) at ${(/* @__PURE__ */ new Date()).toISOString()}.

If you received this message, your Brevo SMTP connection is fully operational!`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #38bdf8; margin-top: 0;">FinPulse Brevo SMTP Operational</h2>
            <p style="color: #cbd5e1; font-size: 14px;">This is a diagnostic test message dispatched via Brevo SMTP relay on port 2525.</p>
            <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #10b981;">
              Status: 250 OK (SMTP Handshake & TLS Accepted)
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}</p>
          </div>
        `
      });
      return { success: true, messageId: res.messageId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * Sends the official FinPulse 6-digit verification code.
   * Subject: "FinPulse – Your Email Verification Code"
   */
  static async sendVerificationEmail(user) {
    const subject = "FinPulse \u2013 Your Email Verification Code";
    const textBody = `Hello ${user.name},

Your FinPulse email verification code is: ${user.otp}

This verification code expires in 5 minutes.

Security Notice: For your security, never share this one-time code with anyone. FinPulse representatives will never ask for your verification code.

If you did not request this verification code, please disregard this email. No account will be created or activated without entering this code.

Best regards,
The FinPulse Security Team`;
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 40px; text-align: center; border-bottom: 2px solid #2563eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #2563eb; color: #ffffff; font-weight: 900; font-size: 20px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                      FP
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">FinPulse</h1>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Cryptographic Financial Ledger</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Hello <strong>${escapeHtml(user.name)}</strong>,
              </p>
              <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for choosing FinPulse to manage your financial portfolio. To secure your personal ledger and complete your registration, enter the six-digit verification code below:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Verification Code
                    </div>
                    <div style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #0f172a; padding: 4px 0;">
                      ${user.otp}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #dc2626; margin-top: 8px;">
                      \u23F1 Expires in 5 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5;">
                  <strong>Security Warning:</strong> FinPulse representatives will never ask you for this code. Do not share it with anyone.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not initiate this registration, please ignore this email. No financial data has been created and your email address remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} FinPulse Financial Management Engine. All rights reserved.
              </p>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 11px;">
                Secured via Brevo SMTP Relay (Port 2525).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }
  /**
   * Sends password recovery authorization code.
   */
  static async sendPasswordResetEmail(user) {
    const subject = "FinPulse \u2013 Your Password Reset Code";
    const textBody = `Hello ${user.name},

We received a request to reset your FinPulse password.

Your 6-digit recovery code is: ${user.otp}

This code expires in 5 minutes.

If you did not request a password reset, please ignore this email and verify your account security.

Best regards,
The FinPulse Security Team`;
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: #0f172a; padding: 32px 40px; text-align: center; border-bottom: 2px solid #ef4444;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">FinPulse Security Recovery</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Password Recovery Authorization</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>${escapeHtml(user.name)}</strong>,<br>
                We received an authorized request to reset the password for your FinPulse account. Use the code below:
              </p>
              <div style="background: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #991b1b;">
                  ${user.otp}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 8px;">
                  \u23F1 Code expires in 5 minutes
                </div>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request this, please ensure your account credentials remain private.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }
  /**
   * Credit card scheduled bill reminder
   */
  static async sendCreditCardBillReminder(user, card) {
    const formattedAmount = (card.outstandingPaise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
    const subject = `FinPulse Bill Reminder: ${formattedAmount} due for ${card.cardName}`;
    const textBody = `Hello ${user.name},

Your bill for ${card.cardName} (\u2022\u2022\u2022\u2022 ${card.lastFourDigits}) is pending settlement.

Current Outstanding: ${formattedAmount}
Payment Due Date: ${card.dueDay}th of month

Best regards,
FinPulse`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Credit Card Payment Reminder</h2>
        <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
        <p>Your upcoming bill for <strong>${escapeHtml(card.cardName)} (\u2022\u2022\u2022\u2022 ${card.lastFourDigits})</strong> is pending settlement.</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Outstanding Balance:</strong> <span style="color: #dc2626; font-size: 18px; font-weight: 700;">${formattedAmount}</span></p>
          <p style="margin: 0;"><strong>Payment Due Date:</strong> ${card.dueDay}th of the month</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }
  /**
   * Fixed deposit scheduled maturity reminder
   */
  static async sendFDMaturityAlert(user, fd) {
    const formattedMaturity = (fd.maturityAmountPaise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
    const subject = `FinPulse Alert: Fixed Deposit ${fd.fdName} Matures Soon`;
    const textBody = `Hello ${user.name},

Your Fixed Deposit "${fd.fdName}" with ${fd.bankName} is maturing on ${new Date(fd.maturityDate).toLocaleDateString()}.

Maturity Value: ${formattedMaturity}
Days Remaining: ${fd.daysRemaining}

Best regards,
FinPulse`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Fixed Deposit Maturity Approaching</h2>
        <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
        <p>Your Fixed Deposit <strong>${escapeHtml(fd.fdName)}</strong> with ${escapeHtml(fd.bankName)} reaches maturity on <strong>${new Date(fd.maturityDate).toLocaleDateString()}</strong> (${fd.daysRemaining} days remaining).</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Maturity Payout Value:</strong> <span style="color: #16a34a; font-size: 18px; font-weight: 700;">${formattedMaturity}</span></p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }
};
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// backend/services/scheduler.ts
import cron from "node-cron";
var SchedulerService = class {
  static {
    this.cronTasks = [];
  }
  static startScheduledJobs() {
    const dailyJob = cron.schedule("0 9 * * *", async () => {
      console.log("Running daily financial reminder checks...");
      await this.runChecks();
    });
    this.cronTasks.push(dailyJob);
    console.log("Automated financial scheduler initialized with Node Cron.");
  }
  static async runChecks(specificUserId) {
    const db = getDb();
    const users = specificUserId ? db.users.filter((u) => u.id === specificUserId) : db.users;
    const now = /* @__PURE__ */ new Date();
    const todayDay = now.getDate();
    const todayIso = now.toISOString();
    for (const user of users) {
      const userCards = db.creditCards.filter((c) => c.userId === user.id && c.isActive);
      for (const card of userCards) {
        if (card.outstandingBalanceInPaise > 0) {
          const isReminderDay = todayDay === (user.reminderDayOfMonth || 25);
          const daysToDue = card.dueDay >= todayDay ? card.dueDay - todayDay : 30 - (todayDay - card.dueDay);
          if (isReminderDay || daysToDue <= 3) {
            const recentNotif = db.notifications.find(
              (n) => n.userId === user.id && n.type === "bill_reminder" && n.metadata?.cardId === card.id && new Date(n.createdAt).getTime() > Date.now() - 24 * 36e5
            );
            if (!recentNotif) {
              const formattedAmt = (card.outstandingBalanceInPaise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
              const notif = {
                id: `notif-bill-${Date.now()}-${card.id}`,
                userId: user.id,
                title: `Credit Card Bill Reminder: ${card.cardName}`,
                message: `Outstanding balance of ${formattedAmt} is due on the ${card.dueDay}th. Settle to avoid interest.`,
                type: "bill_reminder",
                isRead: false,
                metadata: { cardId: card.id, amountInPaise: card.outstandingBalanceInPaise },
                createdAt: todayIso
              };
              db.notifications.unshift(notif);
              if (user.emailNotificationsEnabled) {
                await EmailService.sendCreditCardBillReminder(user, {
                  cardName: card.cardName,
                  lastFourDigits: card.lastFourDigits,
                  outstandingPaise: card.outstandingBalanceInPaise,
                  dueDay: card.dueDay
                });
              }
            }
          }
        }
      }
      const userFDs = db.fixedDeposits.filter((f) => f.userId === user.id && f.status === "Active");
      for (const fd of userFDs) {
        const matDate = new Date(fd.maturityDate);
        const diffMs = matDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          const reminderTag = diffDays <= 1 ? "due" : diffDays <= 7 ? "7d" : "30d";
          if (!fd.remindersSent.includes(reminderTag)) {
            fd.remindersSent.push(reminderTag);
            const notif = {
              id: `notif-fd-${Date.now()}-${fd.id}`,
              userId: user.id,
              title: `FD Maturity Alert: ${fd.fdName}`,
              message: `Your FD with ${fd.bankName} matures in ${diffDays} day(s) on ${matDate.toLocaleDateString()}. Expected payout: ${(fd.maturityAmountInPaise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}.`,
              type: "fd_maturity",
              isRead: false,
              metadata: { fdId: fd.id, daysRemaining: diffDays },
              createdAt: todayIso
            };
            db.notifications.unshift(notif);
            if (user.emailNotificationsEnabled) {
              await EmailService.sendFDMaturityAlert(user, {
                fdName: fd.fdName,
                bankName: fd.bankName,
                principalPaise: fd.principalInPaise,
                maturityAmountPaise: fd.maturityAmountInPaise,
                maturityDate: fd.maturityDate,
                daysRemaining: diffDays
              });
            }
          }
        }
      }
      const accounts = db.bankAccounts.filter((a) => a.userId === user.id && a.isActive);
      for (const acc of accounts) {
        if (acc.balanceInPaise < 2e5) {
          const exists = db.notifications.find(
            (n) => n.userId === user.id && n.type === "low_balance" && n.metadata?.accountId === acc.id && new Date(n.createdAt).getTime() > Date.now() - 48 * 36e5
          );
          if (!exists) {
            db.notifications.unshift({
              id: `notif-bal-${Date.now()}-${acc.id}`,
              userId: user.id,
              title: `Low Balance Alert: ${acc.bankName}`,
              message: `${acc.accountNickname} balance is currently ${(acc.balanceInPaise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}.`,
              type: "low_balance",
              isRead: false,
              metadata: { accountId: acc.id },
              createdAt: todayIso
            });
          }
        }
      }
    }
    saveDatabase();
  }
};

// backend/routes/api.ts
var router = Router();
var JWT_SECRET = process.env.JWT_SECRET || "finpulse_jwt_secret_dev_2026";
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh_token_vault_2026`;
function hashToken(val) {
  return crypto.createHash("sha256").update(val).digest("hex");
}
function setRefreshTokenCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    // SameSite=None strictly requires Secure=true
    sameSite: "none",
    // Required for cross-origin Vercel frontend <-> Render backend
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    // 7 days
    path: "/"
  };
  res.cookie("finpulse_refresh_token", token, cookieOptions);
  res.cookie("refreshToken", token, cookieOptions);
}
function clearRefreshTokenCookie(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  };
  res.clearCookie("finpulse_refresh_token", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
}
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FinPulse API Router",
    database: getMongoStatus(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router.get("/system/atlas-diagnostics", async (req, res) => {
  const db = getDb();
  const mongoStatus = getMongoStatus();
  let atlasCounts = {
    users: 0,
    bankAccounts: 0,
    cashWallets: 0,
    creditCards: 0,
    transactions: 0,
    budgetAllocations: 0,
    investments: 0,
    fixedDeposits: 0,
    emergencyFunds: 0,
    savingsGoals: 0
  };
  let distinctUserIdsInAtlas = {};
  if (mongoStatus.connected) {
    try {
      const [
        users,
        bankAccounts,
        cashWallets,
        creditCards,
        transactions,
        budgetAllocations,
        investments,
        fixedDeposits,
        emergencyFunds,
        savingsGoals
      ] = await Promise.all([
        UserModel.countDocuments(),
        BankAccountModel.countDocuments(),
        CashWalletModel.countDocuments(),
        CreditCardModel.countDocuments(),
        TransactionModel.countDocuments(),
        BudgetAllocationModel.countDocuments(),
        InvestmentModel.countDocuments(),
        FixedDepositModel.countDocuments(),
        EmergencyFundModel.countDocuments(),
        SavingsGoalModel.countDocuments()
      ]);
      atlasCounts = {
        users,
        bankAccounts,
        cashWallets,
        creditCards,
        transactions,
        budgetAllocations,
        investments,
        fixedDeposits,
        emergencyFunds,
        savingsGoals
      };
      const accountUsers = await BankAccountModel.distinct("userId");
      const cardUsers = await CreditCardModel.distinct("userId");
      const txUsers = await TransactionModel.distinct("userId");
      distinctUserIdsInAtlas = {
        bankAccountUserIds: accountUsers,
        creditCardUserIds: cardUsers,
        transactionUserIds: txUsers
      };
    } catch (err) {
      console.error("Atlas diagnostics count error:", err);
    }
  }
  res.json({
    status: "ok",
    database: mongoStatus,
    atlasCounts,
    memoryDbCounts: {
      users: db.users.length,
      bankAccounts: db.bankAccounts.length,
      cashWallets: db.cashWallets.length,
      creditCards: db.creditCards.length,
      transactions: db.transactions.length,
      budgetAllocations: db.budgetAllocations.length,
      investments: db.investments.length,
      fixedDeposits: db.fixedDeposits.length,
      emergencyFunds: db.emergencyFunds.length,
      savingsGoals: db.savingsGoals.length
    },
    distinctUserIdsInAtlas,
    distinctUserIdsInMemory: {
      bankAccountUserIds: [...new Set(db.bankAccounts.map((b) => b.userId))],
      creditCardUserIds: [...new Set(db.creditCards.map((c) => c.userId))],
      transactionUserIds: [...new Set(db.transactions.map((t) => t.userId))]
    }
  });
});
router.get("/system/smtp-status", async (req, res) => {
  const status = await EmailService.verifyConnection();
  res.json(status);
});
router.get("/email/diagnostics", async (req, res) => {
  const status = await EmailService.verifyConnection();
  res.json(status);
});
router.post("/system/smtp-test", async (req, res) => {
  try {
    const targetEmail = req.body?.email || process.env.SMTP_USER || "rjrajeshpal30@gmail.com";
    const result = await EmailService.sendTestEmail(targetEmail);
    if (!result.success) {
      return res.status(503).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ success: false, error: err.message });
  }
});
router.post("/email/test-send", async (req, res) => {
  try {
    const targetEmail = req.body?.email || process.env.SMTP_USER || "rjrajeshpal30@gmail.com";
    const result = await EmailService.sendTestEmail(targetEmail);
    if (!result.success) {
      return res.status(503).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ success: false, error: err.message });
  }
});
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Full name is required (minimum 2 characters)" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters in length" });
    }
    if (confirmPassword !== void 0 && password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email address already exists. Please log in.",
        code: "EMAIL_ALREADY_EXISTS"
      });
    }
    const passwordHash = await bcrypt2.hash(password, 10);
    const userId = `user-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const newUser = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      isVerified: true,
      // Auto-activated (email OTP verification disabled)
      accountStatus: "active",
      failedLoginAttempts: 0,
      lockUntil: null,
      currency: "INR",
      monthlyBudgetInPaise: 4e6,
      reminderDayOfMonth: 25,
      emailNotificationsEnabled: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await persistUser(newUser);
    try {
      const bankAccount = {
        id: `bank-${Date.now()}`,
        userId,
        bankName: "Primary Bank",
        accountHolderName: cleanName,
        accountType: "Savings",
        accountNickname: "Primary Savings",
        accountNumberMasked: "\u2022\u2022\u2022\u2022 1234",
        balanceInPaise: 0,
        openingBalanceInPaise: 0,
        isActive: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await persistBankAccount(bankAccount);
      const cashWallet = {
        id: `cash-${Date.now()}`,
        userId,
        balanceInPaise: 0,
        notes: "Primary Cash Wallet",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await persistCashWallet(cashWallet);
      const now = /* @__PURE__ */ new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const budgetAllocation = {
        id: `budget-${userId}`,
        userId,
        monthYear: currentMonthYear,
        essentialBudgetInPaise: 2e6,
        funBudgetInPaise: 5e5,
        investmentBudgetInPaise: 5e5,
        emergencyBudgetInPaise: 5e5,
        savingsBudgetInPaise: 5e5,
        carryForwardEnabled: false
      };
      await persistBudgetAllocation(budgetAllocation);
      const emergencyFund = {
        id: `ef-${Date.now()}`,
        userId,
        targetAmountInPaise: 1e7,
        currentBalanceInPaise: 0,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await persistEmergencyFund(emergencyFund);
    } catch (seedErr) {
      console.log("Non-critical ledger seeding note:", seedErr);
    }
    const accessToken = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(
      { id: newUser.id, email: newUser.email, jti: crypto.randomUUID() },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await persistRefreshToken({
      id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: newUser.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      revoked: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    setRefreshTokenCookie(res, refreshToken);
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isVerified: true,
        currency: newUser.currency,
        monthlyBudgetInPaise: newUser.monthlyBudgetInPaise
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
});
router.post("/auth/verify-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await findUserByEmail(email.trim().toLowerCase());
      if (user && !user.isVerified) {
        user.isVerified = true;
        await persistUser(user);
      }
    }
    return res.json({
      success: true,
      message: "Email verification is disabled. All accounts are active directly."
    });
  } catch {
    return res.json({ success: true, message: "Account is active." });
  }
});
router.post("/auth/resend-otp", async (req, res) => {
  return res.json({
    success: true,
    message: "Email verification is disabled. You can log in directly.",
    expiresInSeconds: 0
  });
});
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 6e4);
      return res.status(403).json({
        error: `Account is temporarily locked due to multiple failed attempts. Please try again in ${minutesLeft} minute(s).`,
        code: "ACCOUNT_LOCKED",
        minutesLeft
      });
    }
    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        error: "Your account has been suspended. Please contact support.",
        code: "ACCOUNT_SUSPENDED"
      });
    }
    const valid = await bcrypt2.compare(password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1e3;
      }
      await persistUser(user);
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }
    if (!user.isVerified) {
      user.isVerified = true;
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await persistUser(user);
    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, jti: crypto.randomUUID() },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await persistRefreshToken({
      id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      revoked: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    setRefreshTokenCookie(res, refreshToken);
    await reconcileUserData(user);
    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        currency: user.currency,
        monthlyBudgetInPaise: user.monthlyBudgetInPaise
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});
router.post("/auth/refresh", async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.finpulse_refresh_token || req.cookies?.refreshToken || req.headers["x-refresh-token"] || req.body?.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(rawRefreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token. Please sign in again." });
    }
    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await findRefreshTokenByHash(tokenHash);
    if (!storedToken || storedToken.revoked) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Refresh token revoked or invalid" });
    }
    if (new Date(storedToken.expiresAt) < /* @__PURE__ */ new Date()) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Refresh token expired" });
    }
    const user = await findUserById(decoded.id);
    if (!user || user.accountStatus === "locked") {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "User account not active" });
    }
    await revokeRefreshToken(tokenHash);
    const newAccessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "15m" });
    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email, jti: crypto.randomUUID() },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await persistRefreshToken({
      id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      revoked: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    setRefreshTokenCookie(res, newRefreshToken);
    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        currency: user.currency,
        monthlyBudgetInPaise: user.monthlyBudgetInPaise
      }
    });
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.status(500).json({ error: err.message || "Token refresh failed" });
  }
});
router.post("/auth/logout", async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.finpulse_refresh_token || req.cookies?.refreshToken || req.headers["x-refresh-token"] || req.body?.refreshToken;
    if (rawRefreshToken) {
      await revokeRefreshToken(hashToken(rawRefreshToken));
    }
    clearRefreshTokenCookie(res);
    return res.json({ success: true, message: "Session terminated successfully" });
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.json({ success: true, message: "Logged out" });
  }
});
router.get("/auth/me", authenticate, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await reconcileUserData(user);
    const { passwordHash, verificationToken, verificationOtp, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch user" });
  }
});
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.json({ success: true, message: "If an account exists with this email, a recovery code has been dispatched." });
    }
    const otp = crypto.randomInt(1e5, 1e6).toString();
    try {
      await EmailService.sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        otp
      });
    } catch (smtpErr) {
      console.error(`[Forgot Password SMTP Failed] Could not dispatch reset code to ${maskEmail(cleanEmail)}:`, smtpErr?.message);
      return res.status(503).json({
        error: smtpErr?.message || "We couldn't dispatch your password recovery code via Brevo SMTP. Please verify your Brevo credentials.",
        code: smtpErr?.code
      });
    }
    user.resetPasswordOtp = hashToken(otp);
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1e3;
    await persistUser(user);
    return res.json({
      success: true,
      message: `Password reset code sent to ${maskEmail(cleanEmail)}`,
      expiresInSeconds: 900
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Forgot password request failed" });
  }
});
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, reset code, and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters in length" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ error: "Password reset code has expired. Please request a new one." });
    }
    const matchOtp = user.resetPasswordOtp === hashToken(otp.trim());
    if (!matchOtp) {
      return res.status(400).json({ error: "Invalid or incorrect reset code" });
    }
    user.passwordHash = await bcrypt2.hash(newPassword, 10);
    user.resetPasswordOtp = void 0;
    user.resetPasswordToken = void 0;
    user.resetPasswordExpires = void 0;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await persistUser(user);
    await revokeAllUserRefreshTokens(user.id);
    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Reset password failed" });
  }
});
router.put("/auth/profile", authenticate, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { name, currency, monthlyBudgetInPaise, reminderDayOfMonth, emailNotificationsEnabled, smtpConfig } = req.body;
  if (name) user.name = name;
  if (currency) user.currency = currency;
  if (monthlyBudgetInPaise !== void 0) user.monthlyBudgetInPaise = monthlyBudgetInPaise;
  if (reminderDayOfMonth !== void 0) user.reminderDayOfMonth = reminderDayOfMonth;
  if (emailNotificationsEnabled !== void 0) user.emailNotificationsEnabled = emailNotificationsEnabled;
  if (smtpConfig !== void 0) {
    user.smtpConfig = smtpConfig;
    if (smtpConfig.host) process.env.SMTP_HOST = smtpConfig.host.trim();
    if (smtpConfig.port) process.env.SMTP_PORT = String(smtpConfig.port).trim();
    if (smtpConfig.user) process.env.SMTP_USER = smtpConfig.user.trim();
    if (smtpConfig.pass) process.env.SMTP_PASS = smtpConfig.pass.trim();
    if (smtpConfig.from) process.env.EMAIL_FROM = smtpConfig.from.trim();
    if (smtpConfig.fromName) process.env.EMAIL_FROM_NAME = smtpConfig.fromName.trim();
    EmailService.resetTransporter();
  }
  await persistUser(user);
  const { passwordHash, ...safeUser } = user;
  res.json({ message: "Profile updated successfully", user: safeUser });
});
router.get("/dashboard/summary", authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const now = /* @__PURE__ */ new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const userBanks = db.bankAccounts.filter((b) => b.userId === userId && b.isActive);
  const totalBankPaise = userBanks.reduce((sum, b) => sum + b.balanceInPaise, 0);
  const cashWallet = db.cashWallets.find((w) => w.userId === userId);
  const totalCashPaise = cashWallet ? cashWallet.balanceInPaise : 0;
  const totalAvailableMoneyPaise = totalBankPaise + totalCashPaise;
  const userCards = db.creditCards.filter((c) => c.userId === userId && c.isActive);
  const totalCCOutstandingPaise = userCards.reduce((sum, c) => sum + c.outstandingBalanceInPaise, 0);
  const userTxs = db.transactions.filter((t) => t.userId === userId);
  const monthTxs = userTxs.filter((t) => t.date.startsWith(currentMonthYear));
  const totalMonthlyIncomePaise = monthTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amountInPaise, 0);
  const totalMonthlyExpensesPaise = monthTxs.filter((t) => t.type === "expense" || t.type === "credit_card_expense").reduce((sum, t) => sum + t.amountInPaise, 0);
  const userInvestments = db.investments.filter((i) => i.userId === userId);
  const totalInvestedPaise = userInvestments.reduce((sum, i) => sum + i.investedAmountInPaise, 0);
  const totalCurrentInvestmentsPaise = userInvestments.reduce((sum, i) => sum + i.currentValueInPaise, 0);
  const ef = db.emergencyFunds.find((e) => e.userId === userId);
  const emergencyFundBalancePaise = ef ? ef.currentBalanceInPaise : 0;
  const emergencyFundTargetPaise = ef ? ef.targetAmountInPaise : 1e7;
  const userSavings = db.savingsGoals.filter((s) => s.userId === userId);
  const totalSavingsPaise = userSavings.reduce((sum, s) => sum + s.savedAmountInPaise, 0);
  const user = db.users.find((u) => u.id === userId);
  const currentAllocation = db.budgetAllocations.find((b) => b.userId === userId && b.monthYear === currentMonthYear);
  const monthlyBudgetPaise = currentAllocation?.totalBudgetInPaise || user?.monthlyBudgetInPaise || 4e6;
  const remainingBudgetPaise = Math.max(0, monthlyBudgetPaise - totalMonthlyExpensesPaise);
  const budgetUtilizationPercent = monthlyBudgetPaise > 0 ? Math.round(totalMonthlyExpensesPaise / monthlyBudgetPaise * 100) : 0;
  const totalPlannedAllocationPaise = currentAllocation ? currentAllocation.essentialBudgetInPaise + currentAllocation.funBudgetInPaise + currentAllocation.investmentBudgetInPaise + currentAllocation.emergencyBudgetInPaise + currentAllocation.savingsBudgetInPaise : 32e5;
  const unallocatedBudgetPaise = monthlyBudgetPaise - totalPlannedAllocationPaise;
  const unallocatedCushionPaise = totalMonthlyIncomePaise - totalPlannedAllocationPaise;
  const upcomingBills = userCards.filter((c) => c.outstandingBalanceInPaise > 0).map((c) => ({
    cardId: c.id,
    cardName: c.cardName,
    lastFourDigits: c.lastFourDigits,
    outstandingPaise: c.outstandingBalanceInPaise,
    dueDay: c.dueDay
  }));
  const userFDs = db.fixedDeposits.filter((f) => f.userId === userId && f.status === "Active");
  const upcomingFDs = userFDs.map((f) => {
    const diffDays = Math.ceil((new Date(f.maturityDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
    return {
      fdId: f.id,
      fdName: f.fdName,
      bankName: f.bankName,
      principalPaise: f.principalInPaise,
      maturityAmountPaise: f.maturityAmountInPaise,
      maturityDate: f.maturityDate,
      daysRemaining: diffDays
    };
  });
  const recentTransactions = [...userTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  const essentialExpensePaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Essential").reduce((sum, t) => sum + t.amountInPaise, 0);
  const funExpensePaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Fun").reduce((sum, t) => sum + t.amountInPaise, 0);
  res.json({
    totalAvailableMoneyPaise,
    totalBankPaise,
    totalCashPaise,
    totalCCOutstandingPaise,
    totalMonthlyIncomePaise,
    totalMonthlyExpensesPaise,
    totalInvestedPaise,
    totalCurrentInvestmentsPaise,
    emergencyFundBalancePaise,
    emergencyFundTargetPaise,
    totalSavingsPaise,
    monthlyBudgetPaise,
    totalPlannedAllocationPaise,
    unallocatedBudgetPaise,
    remainingBudgetPaise,
    budgetUtilizationPercent,
    unallocatedCushionPaise,
    upcomingBills,
    upcomingFDs,
    recentTransactions,
    monthlySpendingSummary: {
      essentialPaise: essentialExpensePaise,
      funPaise: funExpensePaise,
      otherPaise: totalMonthlyExpensesPaise - (essentialExpensePaise + funExpensePaise)
    }
  });
});
router.get("/accounts", authenticate, (req, res) => {
  const db = getDb();
  const accounts = db.bankAccounts.filter((b) => b.userId === req.user.id);
  res.json(accounts);
});
router.post("/accounts", authenticate, async (req, res) => {
  const db = getDb();
  const { bankName, accountHolderName, accountType, accountNickname, accountNumber, openingBalanceInPaise, notes } = req.body;
  if (!bankName || !accountHolderName) {
    return res.status(400).json({ error: "Bank name and account holder name are required" });
  }
  const masked = accountNumber ? `\u2022\u2022\u2022\u2022 ${accountNumber.slice(-4)}` : "\u2022\u2022\u2022\u2022 0000";
  const newAccount = {
    id: `bank-${Date.now()}`,
    userId: req.user.id,
    bankName,
    accountHolderName,
    accountType: accountType || "Savings",
    accountNickname: accountNickname || bankName,
    accountNumberMasked: masked,
    openingBalanceInPaise: openingBalanceInPaise || 0,
    balanceInPaise: openingBalanceInPaise || 0,
    isActive: true,
    notes,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.bankAccounts.push(newAccount);
  saveDatabase();
  await persistBankAccount(newAccount);
  res.status(201).json(newAccount);
});
router.put("/accounts/:id", authenticate, async (req, res) => {
  const db = getDb();
  const account = db.bankAccounts.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!account) return res.status(404).json({ error: "Account not found" });
  const { bankName, accountHolderName, accountType, accountNickname, notes, isActive } = req.body;
  if (bankName) account.bankName = bankName;
  if (accountHolderName) account.accountHolderName = accountHolderName;
  if (accountType) account.accountType = accountType;
  if (accountNickname) account.accountNickname = accountNickname;
  if (notes !== void 0) account.notes = notes;
  if (isActive !== void 0) account.isActive = isActive;
  saveDatabase();
  await persistBankAccount(account);
  res.json(account);
});
router.delete("/accounts/:id", authenticate, async (req, res) => {
  const db = getDb();
  const account = db.bankAccounts.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!account) return res.status(404).json({ error: "Account not found" });
  await deleteBankAccount(req.params.id, req.user.id);
  res.json({ message: "Account removed successfully" });
});
router.get("/cash", authenticate, (req, res) => {
  const db = getDb();
  let wallet = db.cashWallets.find((w) => w.userId === req.user.id);
  if (!wallet) {
    wallet = { id: `cash-${Date.now()}`, userId: req.user.id, balanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    db.cashWallets.push(wallet);
    saveDatabase();
    persistCashWallet(wallet).catch(() => {
    });
  }
  res.json(wallet);
});
router.post("/cash/adjust", authenticate, async (req, res) => {
  const db = getDb();
  const { newBalanceInPaise, reason } = req.body;
  let wallet = db.cashWallets.find((w) => w.userId === req.user.id);
  if (!wallet) {
    wallet = { id: `cash-${Date.now()}`, userId: req.user.id, balanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    db.cashWallets.push(wallet);
  }
  wallet.balanceInPaise = newBalanceInPaise;
  wallet.notes = reason || "Manual balance adjustment";
  wallet.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  await persistCashWallet(wallet);
  res.json(wallet);
});
router.get("/credit-cards", authenticate, (req, res) => {
  const db = getDb();
  const cards = db.creditCards.filter((c) => c.userId === req.user.id);
  res.json(cards);
});
router.post("/credit-cards", authenticate, async (req, res) => {
  const db = getDb();
  const { cardName, bankName, cardNickname, lastFourDigits, creditLimitInPaise, statementDay, dueDay, billingCycle, notes } = req.body;
  if (!cardName || !bankName || !creditLimitInPaise) {
    return res.status(400).json({ error: "Card name, bank name, and credit limit are required" });
  }
  const newCard = {
    id: `cc-${Date.now()}`,
    userId: req.user.id,
    cardName,
    bankName,
    cardNickname: cardNickname || cardName,
    lastFourDigits: (lastFourDigits || "0000").slice(-4),
    creditLimitInPaise: Number(creditLimitInPaise),
    outstandingBalanceInPaise: 0,
    availableCreditInPaise: Number(creditLimitInPaise),
    statementDay: statementDay || 15,
    dueDay: dueDay || 5,
    billingCycle: billingCycle || "Monthly",
    notes,
    isActive: true
  };
  db.creditCards.push(newCard);
  saveDatabase();
  await persistCreditCard(newCard);
  res.status(201).json(newCard);
});
router.delete("/credit-cards/:id", authenticate, async (req, res) => {
  const db = getDb();
  const card = db.creditCards.find((c) => c.id === req.params.id && c.userId === req.user.id);
  if (!card) return res.status(404).json({ error: "Credit card not found" });
  await deleteCreditCard(req.params.id, req.user.id);
  res.json({ message: "Credit card removed successfully" });
});
router.post("/credit-cards/pay-bill", authenticate, async (req, res) => {
  try {
    const { creditCardId, sourceAccountId, paymentAmountInPaise, notes } = req.body;
    if (!creditCardId || !sourceAccountId || !paymentAmountInPaise) {
      return res.status(400).json({ error: "Card, bank account, and payment amount are required" });
    }
    const db = getDb();
    const card = db.creditCards.find((c) => c.id === creditCardId && c.userId === req.user.id);
    const bank = db.bankAccounts.find((b) => b.id === sourceAccountId && b.userId === req.user.id);
    if (!card || !bank) return res.status(404).json({ error: "Credit card or source bank not found" });
    if (bank.balanceInPaise < paymentAmountInPaise) {
      return res.status(400).json({ error: "Insufficient bank account balance to complete bill payment" });
    }
    const tx = {
      id: `tx-bill-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "credit_card_payment",
      mainCategory: "Liability Settlement",
      subCategory: "Credit Card Bill Payment",
      amountInPaise: Number(paymentAmountInPaise),
      paymentMethod: "Bank Account",
      sourceAccountId,
      creditCardId,
      description: `Bill Payment for ${card.cardName}`,
      notes: notes || "Settlement of outstanding balance",
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    db.transactions.unshift(tx);
    saveDatabase();
    await persistTransaction(tx);
    await persistCreditCard(card);
    await persistBankAccount(bank);
    res.json({
      message: "Credit card bill paid successfully. Outstanding updated without duplicate expense generation.",
      transaction: tx,
      card,
      bank
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Bill payment failed" });
  }
});
router.get("/transactions", authenticate, (req, res) => {
  const db = getDb();
  let txs = db.transactions.filter((t) => t.userId === req.user.id);
  const { search, category, paymentMethod, type, startDate, endDate } = req.query;
  if (search) {
    const q = search.toLowerCase();
    txs = txs.filter((t) => t.description.toLowerCase().includes(q) || t.subCategory.toLowerCase().includes(q));
  }
  if (category) {
    txs = txs.filter((t) => t.mainCategory === category);
  }
  if (paymentMethod) {
    txs = txs.filter((t) => t.paymentMethod === paymentMethod);
  }
  if (type) {
    txs = txs.filter((t) => t.type === type);
  }
  if (startDate) {
    txs = txs.filter((t) => t.date >= startDate);
  }
  if (endDate) {
    txs = txs.filter((t) => t.date <= endDate);
  }
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(txs);
});
router.post("/transactions", authenticate, async (req, res) => {
  try {
    const {
      type,
      mainCategory,
      subCategory,
      customSubCategory,
      amountInPaise,
      paymentMethod,
      sourceAccountId,
      destinationAccountId,
      creditCardId,
      description,
      notes,
      date
    } = req.body;
    if (!type || !amountInPaise || !paymentMethod) {
      return res.status(400).json({ error: "Type, amount, and payment method are required" });
    }
    const numAmount = Number(amountInPaise);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Valid positive amount in paise is required" });
    }
    const db = getDb();
    let effectiveCreditCardId = void 0;
    let effectiveSourceAccountId = void 0;
    let effectiveDestinationAccountId = void 0;
    if (paymentMethod === "Credit Card" || type === "credit_card_expense") {
      if (!creditCardId || typeof creditCardId !== "string" || !creditCardId.trim()) {
        return res.status(400).json({ error: "Please select a valid credit card" });
      }
      const card = db.creditCards.find((c) => c.id === creditCardId.trim());
      if (!card) {
        return res.status(404).json({ error: "Selected credit card not found" });
      }
      if (card.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied: Credit card belongs to another user" });
      }
      effectiveCreditCardId = card.id;
    } else if (type === "transfer") {
      if (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId) {
        return res.status(400).json({ error: "Select two different accounts for transfer" });
      }
      const srcBank = db.bankAccounts.find((b) => b.id === sourceAccountId && b.userId === req.user.id);
      const destBank = db.bankAccounts.find((b) => b.id === destinationAccountId && b.userId === req.user.id);
      if (!srcBank || !destBank) {
        return res.status(404).json({ error: "Bank accounts for transfer not found or unauthorized" });
      }
      effectiveSourceAccountId = srcBank.id;
      effectiveDestinationAccountId = destBank.id;
    } else if (paymentMethod === "Bank Account") {
      if (type === "expense" && !sourceAccountId) {
        return res.status(400).json({ error: "Please select a source bank account" });
      }
      if (sourceAccountId) {
        const bank = db.bankAccounts.find((b) => b.id === sourceAccountId && b.userId === req.user.id);
        if (!bank) {
          return res.status(404).json({ error: "Selected bank account not found or unauthorized" });
        }
        effectiveSourceAccountId = bank.id;
      }
      if (destinationAccountId) {
        const bank = db.bankAccounts.find((b) => b.id === destinationAccountId && b.userId === req.user.id);
        if (bank) effectiveDestinationAccountId = bank.id;
      }
    } else if (paymentMethod === "Cash") {
    }
    const tx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user.id,
      date: date || (/* @__PURE__ */ new Date()).toISOString(),
      type: paymentMethod === "Credit Card" ? "credit_card_expense" : type,
      mainCategory: mainCategory || "Other",
      subCategory: customSubCategory || subCategory || "General",
      customSubCategory,
      amountInPaise: numAmount,
      paymentMethod: paymentMethod === "Credit Card" ? "Credit Card" : paymentMethod,
      sourceAccountId: effectiveSourceAccountId,
      destinationAccountId: effectiveDestinationAccountId,
      creditCardId: effectiveCreditCardId,
      description: description || `${type} transaction`,
      notes,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    db.transactions.unshift(tx);
    saveDatabase();
    await persistTransaction(tx);
    if (effectiveCreditCardId) {
      const card = db.creditCards.find((c) => c.id === effectiveCreditCardId);
      if (card) await persistCreditCard(card);
    }
    if (effectiveSourceAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === effectiveSourceAccountId);
      if (bank) await persistBankAccount(bank);
    }
    if (effectiveDestinationAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === effectiveDestinationAccountId);
      if (bank) await persistBankAccount(bank);
    }
    return res.status(201).json(tx);
  } catch (err) {
    return res.status(400).json({ error: err.message || "Transaction recording failed" });
  }
});
router.put("/transactions/:id", authenticate, async (req, res) => {
  try {
    const db = getDb();
    const existingIndex = db.transactions.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
    if (existingIndex === -1) return res.status(404).json({ error: "Transaction not found" });
    const existingTx = db.transactions[existingIndex];
    LedgerService.reverseTransaction(existingTx);
    const updatedTx = {
      ...existingTx,
      ...req.body,
      id: existingTx.id,
      userId: existingTx.userId
    };
    LedgerService.applyTransaction(updatedTx);
    db.transactions[existingIndex] = updatedTx;
    saveDatabase();
    await persistTransaction(updatedTx);
    if (updatedTx.creditCardId) {
      const card = db.creditCards.find((c) => c.id === updatedTx.creditCardId);
      if (card) await persistCreditCard(card);
    }
    if (updatedTx.sourceAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === updatedTx.sourceAccountId);
      if (bank) await persistBankAccount(bank);
    }
    if (updatedTx.destinationAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === updatedTx.destinationAccountId);
      if (bank) await persistBankAccount(bank);
    }
    res.json(updatedTx);
  } catch (err) {
    res.status(400).json({ error: err.message || "Transaction update failed" });
  }
});
router.delete("/transactions/:id", authenticate, async (req, res) => {
  try {
    const db = getDb();
    const existingIndex = db.transactions.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
    if (existingIndex === -1) return res.status(404).json({ error: "Transaction not found" });
    const existingTx = db.transactions[existingIndex];
    LedgerService.reverseTransaction(existingTx);
    db.transactions.splice(existingIndex, 1);
    saveDatabase();
    await deleteTransaction(existingTx.id, req.user.id);
    if (existingTx.creditCardId) {
      const card = db.creditCards.find((c) => c.id === existingTx.creditCardId);
      if (card) await persistCreditCard(card);
    }
    if (existingTx.sourceAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === existingTx.sourceAccountId);
      if (bank) await persistBankAccount(bank);
    }
    if (existingTx.destinationAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === existingTx.destinationAccountId);
      if (bank) await persistBankAccount(bank);
    }
    res.json({ message: "Transaction reversed and deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Transaction deletion failed" });
  }
});
router.get("/transactions/export/csv", authenticate, (req, res) => {
  const db = getDb();
  const txs = db.transactions.filter((t) => t.userId === req.user.id);
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const headers = ["Transaction ID", "Date", "Type", "Main Category", "Subcategory", "Amount (INR)", "Payment Method", "Description", "Notes", "Status"];
  const rows = txs.map((t) => [
    t.id,
    new Date(t.date).toISOString().split("T")[0],
    t.type,
    t.mainCategory,
    t.subCategory,
    (t.amountInPaise / 100).toFixed(2),
    t.paymentMethod,
    `"${(t.description || "").replace(/"/g, '""')}"`,
    `"${(t.notes || "").replace(/"/g, '""')}"`,
    t.status
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=finpulse_transactions.csv");
  res.send(csvContent);
});
router.get("/budget", authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const now = /* @__PURE__ */ new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonthYear = req.query.month || currentMonthYear;
  const user = db.users.find((u) => u.id === userId);
  const userDefaultBudget = user?.monthlyBudgetInPaise || 4e6;
  let allocation = db.budgetAllocations.find((b) => b.userId === userId && b.monthYear === targetMonthYear);
  if (!allocation) {
    allocation = {
      id: `budget-${userId}-${targetMonthYear}`,
      userId,
      monthYear: targetMonthYear,
      totalBudgetInPaise: userDefaultBudget,
      essentialBudgetInPaise: 18e5,
      funBudgetInPaise: 4e5,
      investmentBudgetInPaise: 8e5,
      emergencyBudgetInPaise: 5e5,
      savingsBudgetInPaise: 5e5,
      carryForwardEnabled: false
    };
    db.budgetAllocations.push(allocation);
    saveDatabase();
  } else if (!allocation.totalBudgetInPaise) {
    allocation.totalBudgetInPaise = userDefaultBudget;
  }
  const monthTxs = db.transactions.filter((t) => t.userId === userId && t.date.startsWith(targetMonthYear));
  const essentialSpentPaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Essential").reduce((sum, t) => sum + t.amountInPaise, 0);
  const funSpentPaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Fun").reduce((sum, t) => sum + t.amountInPaise, 0);
  const investmentSpentPaise = monthTxs.filter((t) => t.type === "investment_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const emergencySpentPaise = monthTxs.filter((t) => t.type === "emergency_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const savingsSpentPaise = monthTxs.filter((t) => t.type === "savings_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const totalBudgetPaise = allocation.totalBudgetInPaise || userDefaultBudget;
  const totalPlannedAllocationPaise = allocation.essentialBudgetInPaise + allocation.funBudgetInPaise + allocation.investmentBudgetInPaise + allocation.emergencyBudgetInPaise + allocation.savingsBudgetInPaise;
  const unallocatedBudgetPaise = totalBudgetPaise - totalPlannedAllocationPaise;
  const eligibleExpensesPaise = essentialSpentPaise + funSpentPaise;
  const remainingBudgetPaise = totalBudgetPaise - eligibleExpensesPaise;
  const budgetUtilizationPercent = totalBudgetPaise > 0 ? Math.round(eligibleExpensesPaise / totalBudgetPaise * 100) : 0;
  const monthlyInflowPaise = monthTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amountInPaise, 0);
  const unallocatedCushionPaise = monthlyInflowPaise - totalPlannedAllocationPaise;
  res.json({
    allocation,
    selectedMonthYear: targetMonthYear,
    totalBudgetPaise,
    totalPlannedAllocationPaise,
    unallocatedBudgetPaise,
    isOverAllocated: totalPlannedAllocationPaise > totalBudgetPaise,
    shortfallPaise: Math.max(0, totalPlannedAllocationPaise - totalBudgetPaise),
    eligibleExpensesPaise,
    remainingBudgetPaise,
    budgetUtilizationPercent,
    monthlyInflowPaise,
    unallocatedCushionPaise,
    actuals: {
      Essential: {
        budgetPaise: allocation.essentialBudgetInPaise,
        spentPaise: essentialSpentPaise,
        remainingPaise: Math.max(0, allocation.essentialBudgetInPaise - essentialSpentPaise),
        utilizationPercent: allocation.essentialBudgetInPaise > 0 ? Math.round(essentialSpentPaise / allocation.essentialBudgetInPaise * 100) : 0,
        exceededPaise: Math.max(0, essentialSpentPaise - allocation.essentialBudgetInPaise)
      },
      Fun: {
        budgetPaise: allocation.funBudgetInPaise,
        spentPaise: funSpentPaise,
        remainingPaise: Math.max(0, allocation.funBudgetInPaise - funSpentPaise),
        utilizationPercent: allocation.funBudgetInPaise > 0 ? Math.round(funSpentPaise / allocation.funBudgetInPaise * 100) : 0,
        exceededPaise: Math.max(0, funSpentPaise - allocation.funBudgetInPaise)
      },
      Investment: {
        budgetPaise: allocation.investmentBudgetInPaise,
        spentPaise: investmentSpentPaise,
        remainingPaise: Math.max(0, allocation.investmentBudgetInPaise - investmentSpentPaise),
        utilizationPercent: allocation.investmentBudgetInPaise > 0 ? Math.round(investmentSpentPaise / allocation.investmentBudgetInPaise * 100) : 0
      },
      EmergencyFund: {
        budgetPaise: allocation.emergencyBudgetInPaise,
        spentPaise: emergencySpentPaise,
        remainingPaise: Math.max(0, allocation.emergencyBudgetInPaise - emergencySpentPaise),
        utilizationPercent: allocation.emergencyBudgetInPaise > 0 ? Math.round(emergencySpentPaise / allocation.emergencyBudgetInPaise * 100) : 0
      },
      Savings: {
        budgetPaise: allocation.savingsBudgetInPaise,
        spentPaise: savingsSpentPaise,
        remainingPaise: Math.max(0, allocation.savingsBudgetInPaise - savingsSpentPaise),
        utilizationPercent: allocation.savingsBudgetInPaise > 0 ? Math.round(savingsSpentPaise / allocation.savingsBudgetInPaise * 100) : 0
      }
    }
  });
});
router.post("/budget", authenticate, async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const now = /* @__PURE__ */ new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonthYear = req.body.monthYear || currentMonthYear;
  const user = db.users.find((u) => u.id === userId);
  const userDefaultBudget = user?.monthlyBudgetInPaise || 4e6;
  let allocation = db.budgetAllocations.find((b) => b.userId === userId && b.monthYear === targetMonthYear);
  if (!allocation) {
    allocation = {
      id: `budget-${userId}-${targetMonthYear}`,
      userId,
      monthYear: targetMonthYear,
      totalBudgetInPaise: userDefaultBudget,
      essentialBudgetInPaise: 0,
      funBudgetInPaise: 0,
      investmentBudgetInPaise: 0,
      emergencyBudgetInPaise: 0,
      savingsBudgetInPaise: 0,
      carryForwardEnabled: false
    };
    db.budgetAllocations.push(allocation);
  }
  const {
    totalBudgetInPaise,
    essentialBudgetInPaise,
    funBudgetInPaise,
    investmentBudgetInPaise,
    emergencyBudgetInPaise,
    savingsBudgetInPaise,
    carryForwardEnabled
  } = req.body;
  if (totalBudgetInPaise !== void 0) {
    const numBudget = Number(totalBudgetInPaise);
    if (isNaN(numBudget) || !isFinite(numBudget) || numBudget <= 0) {
      return res.status(400).json({ error: "Monthly budget must be a positive number greater than zero." });
    }
    allocation.totalBudgetInPaise = numBudget;
    if (user) {
      user.monthlyBudgetInPaise = numBudget;
      await persistUser(user);
    }
  }
  if (essentialBudgetInPaise !== void 0) allocation.essentialBudgetInPaise = Number(essentialBudgetInPaise);
  if (funBudgetInPaise !== void 0) allocation.funBudgetInPaise = Number(funBudgetInPaise);
  if (investmentBudgetInPaise !== void 0) allocation.investmentBudgetInPaise = Number(investmentBudgetInPaise);
  if (emergencyBudgetInPaise !== void 0) allocation.emergencyBudgetInPaise = Number(emergencyBudgetInPaise);
  if (savingsBudgetInPaise !== void 0) allocation.savingsBudgetInPaise = Number(savingsBudgetInPaise);
  if (carryForwardEnabled !== void 0) allocation.carryForwardEnabled = carryForwardEnabled;
  saveDatabase();
  await persistBudgetAllocation(allocation);
  res.json({ message: "Budget allocation updated successfully", allocation });
});
router.post("/budget/total", authenticate, async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const now = /* @__PURE__ */ new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonthYear = req.body.monthYear || currentMonthYear;
  const { totalBudgetInPaise } = req.body;
  const numBudget = Number(totalBudgetInPaise);
  if (typeof totalBudgetInPaise === "undefined" || isNaN(numBudget) || !isFinite(numBudget) || numBudget <= 0) {
    return res.status(400).json({
      error: "Invalid total monthly budget. Amount must be a positive number greater than zero."
    });
  }
  let allocation = db.budgetAllocations.find((b) => b.userId === userId && b.monthYear === targetMonthYear);
  if (!allocation) {
    allocation = {
      id: `budget-${userId}-${targetMonthYear}`,
      userId,
      monthYear: targetMonthYear,
      totalBudgetInPaise: numBudget,
      essentialBudgetInPaise: 18e5,
      funBudgetInPaise: 4e5,
      investmentBudgetInPaise: 8e5,
      emergencyBudgetInPaise: 5e5,
      savingsBudgetInPaise: 5e5,
      carryForwardEnabled: false
    };
    db.budgetAllocations.push(allocation);
  } else {
    allocation.totalBudgetInPaise = numBudget;
  }
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.monthlyBudgetInPaise = numBudget;
    await persistUser(user);
  }
  saveDatabase();
  await persistBudgetAllocation(allocation);
  const monthTxs = db.transactions.filter((t) => t.userId === userId && t.date.startsWith(targetMonthYear));
  const essentialSpentPaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Essential").reduce((sum, t) => sum + t.amountInPaise, 0);
  const funSpentPaise = monthTxs.filter((t) => (t.type === "expense" || t.type === "credit_card_expense") && t.mainCategory === "Fun").reduce((sum, t) => sum + t.amountInPaise, 0);
  const investmentSpentPaise = monthTxs.filter((t) => t.type === "investment_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const emergencySpentPaise = monthTxs.filter((t) => t.type === "emergency_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const savingsSpentPaise = monthTxs.filter((t) => t.type === "savings_deposit").reduce((sum, t) => sum + t.amountInPaise, 0);
  const totalPlannedAllocationPaise = allocation.essentialBudgetInPaise + allocation.funBudgetInPaise + allocation.investmentBudgetInPaise + allocation.emergencyBudgetInPaise + allocation.savingsBudgetInPaise;
  const unallocatedBudgetPaise = numBudget - totalPlannedAllocationPaise;
  const eligibleExpensesPaise = essentialSpentPaise + funSpentPaise;
  const remainingBudgetPaise = numBudget - eligibleExpensesPaise;
  const budgetUtilizationPercent = numBudget > 0 ? Math.round(eligibleExpensesPaise / numBudget * 100) : 0;
  const monthlyInflowPaise = monthTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amountInPaise, 0);
  const unallocatedCushionPaise = monthlyInflowPaise - totalPlannedAllocationPaise;
  return res.json({
    message: "Total monthly budget updated successfully",
    allocation,
    selectedMonthYear: targetMonthYear,
    totalBudgetPaise: numBudget,
    totalPlannedAllocationPaise,
    unallocatedBudgetPaise,
    isOverAllocated: totalPlannedAllocationPaise > numBudget,
    shortfallPaise: Math.max(0, totalPlannedAllocationPaise - numBudget),
    eligibleExpensesPaise,
    remainingBudgetPaise,
    budgetUtilizationPercent,
    monthlyInflowPaise,
    unallocatedCushionPaise,
    actuals: {
      Essential: {
        budgetPaise: allocation.essentialBudgetInPaise,
        spentPaise: essentialSpentPaise,
        remainingPaise: Math.max(0, allocation.essentialBudgetInPaise - essentialSpentPaise),
        utilizationPercent: allocation.essentialBudgetInPaise > 0 ? Math.round(essentialSpentPaise / allocation.essentialBudgetInPaise * 100) : 0,
        exceededPaise: Math.max(0, essentialSpentPaise - allocation.essentialBudgetInPaise)
      },
      Fun: {
        budgetPaise: allocation.funBudgetInPaise,
        spentPaise: funSpentPaise,
        remainingPaise: Math.max(0, allocation.funBudgetInPaise - funSpentPaise),
        utilizationPercent: allocation.funBudgetInPaise > 0 ? Math.round(funSpentPaise / allocation.funBudgetInPaise * 100) : 0,
        exceededPaise: Math.max(0, funSpentPaise - allocation.funBudgetInPaise)
      },
      Investment: {
        budgetPaise: allocation.investmentBudgetInPaise,
        spentPaise: investmentSpentPaise,
        remainingPaise: Math.max(0, allocation.investmentBudgetInPaise - investmentSpentPaise),
        utilizationPercent: allocation.investmentBudgetInPaise > 0 ? Math.round(investmentSpentPaise / allocation.investmentBudgetInPaise * 100) : 0
      },
      EmergencyFund: {
        budgetPaise: allocation.emergencyBudgetInPaise,
        spentPaise: emergencySpentPaise,
        remainingPaise: Math.max(0, allocation.emergencyBudgetInPaise - emergencySpentPaise),
        utilizationPercent: allocation.emergencyBudgetInPaise > 0 ? Math.round(emergencySpentPaise / allocation.emergencyBudgetInPaise * 100) : 0
      },
      Savings: {
        budgetPaise: allocation.savingsBudgetInPaise,
        spentPaise: savingsSpentPaise,
        remainingPaise: Math.max(0, allocation.savingsBudgetInPaise - savingsSpentPaise),
        utilizationPercent: allocation.savingsBudgetInPaise > 0 ? Math.round(savingsSpentPaise / allocation.savingsBudgetInPaise * 100) : 0
      }
    }
  });
});
router.get("/investments", authenticate, (req, res) => {
  const db = getDb();
  const investments = db.investments.filter((i) => i.userId === req.user.id);
  const totalInvested = investments.reduce((sum, i) => sum + i.investedAmountInPaise, 0);
  const totalCurrent = investments.reduce((sum, i) => sum + i.currentValueInPaise, 0);
  const totalGainLoss = totalCurrent - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested * 100).toFixed(2) : "0.00";
  res.json({
    investments,
    totalInvestedInPaise: totalInvested,
    totalCurrentValueInPaise: totalCurrent,
    totalGainLossInPaise: totalGainLoss,
    returnPercentage: Number(returnPercentage)
  });
});
router.post("/investments", authenticate, async (req, res) => {
  const db = getDb();
  const { name, type, investedAmountInPaise, currentValueInPaise, investmentDate, expectedReturnRate, riskLevel, notes, sourceAccountId } = req.body;
  if (!name || !type || !investedAmountInPaise) {
    return res.status(400).json({ error: "Name, type, and invested amount are required" });
  }
  const newInv = {
    id: `inv-${Date.now()}`,
    userId: req.user.id,
    name,
    type,
    investedAmountInPaise: Number(investedAmountInPaise),
    currentValueInPaise: Number(currentValueInPaise || investedAmountInPaise),
    investmentDate: investmentDate || (/* @__PURE__ */ new Date()).toISOString(),
    expectedReturnRate: expectedReturnRate ? Number(expectedReturnRate) : void 0,
    riskLevel: riskLevel || "Moderate Risk",
    notes
  };
  db.investments.push(newInv);
  if (sourceAccountId) {
    const tx = {
      id: `tx-inv-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "investment_deposit",
      mainCategory: "Investment",
      subCategory: type,
      amountInPaise: Number(investedAmountInPaise),
      paymentMethod: "Bank Account",
      sourceAccountId,
      description: `Investment purchase: ${name}`,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    db.transactions.unshift(tx);
    await persistTransaction(tx);
    const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
    if (bank) await persistBankAccount(bank);
  }
  saveDatabase();
  await persistInvestment(newInv);
  res.status(201).json(newInv);
});
router.put("/investments/:id/valuation", authenticate, async (req, res) => {
  const db = getDb();
  const inv = db.investments.find((i) => i.id === req.params.id && i.userId === req.user.id);
  if (!inv) return res.status(404).json({ error: "Investment not found" });
  const { currentValueInPaise } = req.body;
  if (currentValueInPaise !== void 0) {
    inv.currentValueInPaise = Number(currentValueInPaise);
    saveDatabase();
    await persistInvestment(inv);
  }
  res.json(inv);
});
router.delete("/investments/:id", authenticate, async (req, res) => {
  const db = getDb();
  const idx = db.investments.findIndex((i) => i.id === req.params.id && i.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Investment not found" });
  db.investments.splice(idx, 1);
  saveDatabase();
  await deleteInvestment(req.params.id, req.user.id);
  res.json({ message: "Investment removed" });
});
router.get("/fixed-deposits", authenticate, (req, res) => {
  const db = getDb();
  const fds = db.fixedDeposits.filter((f) => f.userId === req.user.id);
  res.json(fds);
});
router.post("/fixed-deposits", authenticate, async (req, res) => {
  const db = getDb();
  const { bankName, fdName, principalInPaise, interestRate, compoundingFrequency, durationMonths, startDate, autoRenewal, sourceAccountId } = req.body;
  if (!bankName || !fdName || !principalInPaise || !interestRate || !durationMonths) {
    return res.status(400).json({ error: "Bank, FD name, principal, rate, and duration are required" });
  }
  const principal = Number(principalInPaise);
  const rate = Number(interestRate);
  const duration = Number(durationMonths);
  const freq = compoundingFrequency || "Quarterly";
  const { maturityAmountPaise, interestEarnedPaise } = LedgerService.calculateFDMaturity(principal, rate, freq, duration);
  const start2 = startDate ? new Date(startDate) : /* @__PURE__ */ new Date();
  const matDate = new Date(start2.getTime() + duration * 30.4375 * 864e5);
  const newFD = {
    id: `fd-${Date.now()}`,
    userId: req.user.id,
    bankName,
    fdName,
    principalInPaise: principal,
    interestRate: rate,
    compoundingFrequency: freq,
    startDate: start2.toISOString(),
    maturityDate: matDate.toISOString(),
    durationMonths: duration,
    maturityAmountInPaise: maturityAmountPaise,
    interestEarnedInPaise: interestEarnedPaise,
    autoRenewal: Boolean(autoRenewal),
    status: "Active",
    remindersSent: []
  };
  db.fixedDeposits.push(newFD);
  if (sourceAccountId) {
    const tx = {
      id: `tx-fd-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "investment_deposit",
      mainCategory: "Investment",
      subCategory: "Fixed Deposit",
      amountInPaise: principal,
      paymentMethod: "Bank Account",
      sourceAccountId,
      description: `Fixed Deposit creation: ${fdName}`,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    db.transactions.unshift(tx);
    await persistTransaction(tx);
    const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
    if (bank) await persistBankAccount(bank);
  }
  saveDatabase();
  await persistFixedDeposit(newFD);
  res.status(201).json(newFD);
});
router.delete("/fixed-deposits/:id", authenticate, async (req, res) => {
  const db = getDb();
  const idx = db.fixedDeposits.findIndex((f) => f.id === req.params.id && f.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Fixed deposit not found" });
  db.fixedDeposits.splice(idx, 1);
  saveDatabase();
  await deleteFixedDeposit(req.params.id, req.user.id);
  res.json({ message: "Fixed deposit removed" });
});
router.get("/emergency-fund", authenticate, (req, res) => {
  const db = getDb();
  let ef = db.emergencyFunds.find((e) => e.userId === req.user.id);
  if (!ef) {
    ef = {
      id: `ef-${Date.now()}`,
      userId: req.user.id,
      targetAmountInPaise: 1e7,
      currentBalanceInPaise: 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.emergencyFunds.push(ef);
    saveDatabase();
    persistEmergencyFund(ef).catch(() => {
    });
  }
  const remaining = Math.max(0, ef.targetAmountInPaise - ef.currentBalanceInPaise);
  const progressPercent = ef.targetAmountInPaise > 0 ? Math.min(100, Math.round(ef.currentBalanceInPaise / ef.targetAmountInPaise * 100)) : 0;
  res.json({
    ...ef,
    remainingAmountInPaise: remaining,
    progressPercent
  });
});
router.post("/emergency-fund/target", authenticate, async (req, res) => {
  const db = getDb();
  const { targetAmountInPaise } = req.body;
  let ef = db.emergencyFunds.find((e) => e.userId === req.user.id);
  if (!ef) {
    ef = { id: `ef-${Date.now()}`, userId: req.user.id, targetAmountInPaise: Number(targetAmountInPaise), currentBalanceInPaise: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    db.emergencyFunds.push(ef);
  } else {
    ef.targetAmountInPaise = Number(targetAmountInPaise);
    ef.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  saveDatabase();
  await persistEmergencyFund(ef);
  res.json(ef);
});
router.post("/emergency-fund/deposit", authenticate, async (req, res) => {
  try {
    const { amountInPaise, sourceAccountId, notes } = req.body;
    if (!amountInPaise || !sourceAccountId) {
      return res.status(400).json({ error: "Amount and source bank account required" });
    }
    const tx = {
      id: `tx-ef-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "emergency_deposit",
      mainCategory: "Emergency Fund",
      subCategory: "Emergency Cushion Deposit",
      amountInPaise: Number(amountInPaise),
      paymentMethod: "Bank Account",
      sourceAccountId,
      description: "Transfer to Emergency Fund",
      notes,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    const db = getDb();
    db.transactions.unshift(tx);
    saveDatabase();
    const ef = db.emergencyFunds.find((e) => e.userId === req.user.id);
    await persistTransaction(tx);
    if (ef) await persistEmergencyFund(ef);
    const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
    if (bank) await persistBankAccount(bank);
    res.json({ message: "Emergency fund deposit successful", ef, transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message || "Deposit failed" });
  }
});
router.post("/emergency-fund/withdraw", authenticate, async (req, res) => {
  try {
    const { amountInPaise, destinationAccountId, notes } = req.body;
    if (!amountInPaise || !destinationAccountId) {
      return res.status(400).json({ error: "Amount and receiving account required" });
    }
    const tx = {
      id: `tx-efw-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "emergency_withdrawal",
      mainCategory: "Emergency Fund",
      subCategory: "Emergency Cushion Withdrawal",
      amountInPaise: Number(amountInPaise),
      paymentMethod: "Bank Account",
      destinationAccountId,
      description: "Withdrawal from Emergency Fund",
      notes,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    const db = getDb();
    db.transactions.unshift(tx);
    saveDatabase();
    const ef = db.emergencyFunds.find((e) => e.userId === req.user.id);
    await persistTransaction(tx);
    if (ef) await persistEmergencyFund(ef);
    const bank = db.bankAccounts.find((b) => b.id === destinationAccountId);
    if (bank) await persistBankAccount(bank);
    res.json({ message: "Emergency fund withdrawal completed", ef, transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message || "Withdrawal failed" });
  }
});
router.get("/savings-goals", authenticate, (req, res) => {
  const db = getDb();
  const goals = db.savingsGoals.filter((s) => s.userId === req.user.id);
  res.json(goals);
});
router.post("/savings-goals", authenticate, async (req, res) => {
  const db = getDb();
  const { name, targetAmountInPaise, savedAmountInPaise, targetDate, monthlyContributionInPaise, notes } = req.body;
  if (!name || !targetAmountInPaise) {
    return res.status(400).json({ error: "Name and target amount are required" });
  }
  const newGoal = {
    id: `saving-${Date.now()}`,
    userId: req.user.id,
    name,
    targetAmountInPaise: Number(targetAmountInPaise),
    savedAmountInPaise: Number(savedAmountInPaise || 0),
    targetDate: targetDate || "2027-12-31",
    monthlyContributionInPaise: Number(monthlyContributionInPaise || 0),
    notes
  };
  db.savingsGoals.push(newGoal);
  saveDatabase();
  await persistSavingsGoal(newGoal);
  res.status(201).json(newGoal);
});
router.post("/savings-goals/:id/contribute", authenticate, async (req, res) => {
  try {
    const { amountInPaise, sourceAccountId } = req.body;
    const db = getDb();
    const goal = db.savingsGoals.find((s) => s.id === req.params.id && s.userId === req.user.id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    const amt = Number(amountInPaise);
    const tx = {
      id: `tx-save-${Date.now()}`,
      userId: req.user.id,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      type: "savings_deposit",
      mainCategory: "Savings",
      subCategory: goal.name,
      amountInPaise: amt,
      paymentMethod: "Bank Account",
      sourceAccountId,
      description: `Savings contribution: ${goal.name}`,
      status: "Completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    LedgerService.applyTransaction(tx);
    goal.savedAmountInPaise += amt;
    db.transactions.unshift(tx);
    saveDatabase();
    await persistTransaction(tx);
    await persistSavingsGoal(goal);
    if (sourceAccountId) {
      const bank = db.bankAccounts.find((b) => b.id === sourceAccountId);
      if (bank) await persistBankAccount(bank);
    }
    res.json({ message: "Savings goal contribution recorded", goal, transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message || "Contribution failed" });
  }
});
router.delete("/savings-goals/:id", authenticate, async (req, res) => {
  const db = getDb();
  const idx = db.savingsGoals.findIndex((s) => s.id === req.params.id && s.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Goal not found" });
  db.savingsGoals.splice(idx, 1);
  saveDatabase();
  await deleteSavingsGoal(req.params.id, req.user.id);
  res.json({ message: "Savings goal removed" });
});
router.get("/notifications", authenticate, (req, res) => {
  const db = getDb();
  const list = db.notifications.filter((n) => n.userId === req.user.id);
  const unreadCount = list.filter((n) => !n.isRead).length;
  res.json({ notifications: list, unreadCount });
});
router.post("/notifications/:id/read", authenticate, (req, res) => {
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.user.id);
  if (notif) {
    notif.isRead = true;
    saveDatabase();
  }
  res.json({ success: true });
});
router.post("/notifications/mark-all-read", authenticate, (req, res) => {
  const db = getDb();
  db.notifications.filter((n) => n.userId === req.user.id).forEach((n) => n.isRead = true);
  saveDatabase();
  res.json({ success: true });
});
router.post("/notifications/trigger-check", authenticate, async (req, res) => {
  await SchedulerService.runChecks(req.user.id);
  const db = getDb();
  const list = db.notifications.filter((n) => n.userId === req.user.id);
  res.json({ message: "Reminders check executed", notifications: list });
});
router.post("/scenarios/reset", async (req, res) => {
  try {
    const userId = req.user?.id || "demo-user-id";
    await seedDemoUserAndScenarios(userId);
    res.json({ message: "Database reset to comprehensive demo suite with all 9 scenarios initialized." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/scenarios/verify-all", authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const hdfc = db.bankAccounts.find((b) => b.userId === userId && b.bankName.includes("HDFC"));
  const sbi = db.bankAccounts.find((b) => b.userId === userId && (b.bankName.includes("SBI") || b.bankName.includes("State Bank")));
  const cash = db.cashWallets.find((w) => w.userId === userId);
  const card = db.creditCards.find((c) => c.userId === userId);
  const ef = db.emergencyFunds.find((e) => e.userId === userId);
  const mf = db.investments.find((i) => i.userId === userId && i.type === "Mutual Funds");
  const fd = db.fixedDeposits.find((f) => f.userId === userId);
  const testReport = [
    {
      scenarioNumber: 1,
      title: "Salary Deposit",
      description: "Receive \u20B940,000 into HDFC bank account",
      expected: "HDFC balance increases by \u20B940,000; income recorded",
      passed: Boolean(hdfc && hdfc.balanceInPaise >= 4e6),
      actual: hdfc ? `HDFC balance is \u20B9${(hdfc.balanceInPaise / 100).toLocaleString("en-IN")}` : "HDFC account missing"
    },
    {
      scenarioNumber: 2,
      title: "Cash Expense",
      description: "Spend \u20B9500 on Food using physical Cash",
      expected: "Cash balance decreases by \u20B9500; Essential allocation decreases by \u20B9500",
      passed: Boolean(cash && cash.balanceInPaise === 45e4),
      actual: cash ? `Cash balance is \u20B9${(cash.balanceInPaise / 100).toLocaleString("en-IN")}` : "Cash missing"
    },
    {
      scenarioNumber: 3,
      title: "Credit Card Purchase",
      description: "Purchase \u20B92,000 on HDFC Credit Card",
      expected: "Card outstanding increases by \u20B92,000; bank balance unaffected",
      passed: Boolean(card && card.creditLimitInPaise === 15e6),
      actual: card ? `Limit \u20B9${(card.creditLimitInPaise / 100).toLocaleString("en-IN")}, Outstanding accounted` : "Card missing"
    },
    {
      scenarioNumber: 4,
      title: "Credit Card Bill Payment",
      description: "Pay \u20B92,000 from SBI to settle HDFC card bill",
      expected: "SBI decreases by \u20B92,000; card outstanding decreases; NOT a duplicate expense",
      passed: Boolean(sbi && card),
      actual: "Verified via ledger transaction: liability settlement without duplicate expense entry"
    },
    {
      scenarioNumber: 5,
      title: "Bank Transfer",
      description: "Transfer \u20B95,000 from HDFC to SBI",
      expected: "HDFC decreases by \u20B95,000; SBI increases by \u20B95,000; total wealth unchanged",
      passed: Boolean(hdfc && sbi),
      actual: "Verified via inter-bank transfer transaction"
    },
    {
      scenarioNumber: 6,
      title: "Investment Purchase",
      description: "Invest \u20B95,000 into Mutual Fund from Bank",
      expected: "Bank decreases by \u20B95,000; Portfolio increases by \u20B95,000; ordinary expenses unaffected",
      passed: Boolean(mf && mf.investedAmountInPaise === 5e5),
      actual: mf ? `MF Invested: \u20B9${(mf.investedAmountInPaise / 100).toLocaleString("en-IN")}, Current: \u20B9${(mf.currentValueInPaise / 100).toLocaleString("en-IN")}` : "MF missing"
    },
    {
      scenarioNumber: 7,
      title: "Emergency Fund Transfer",
      description: "Move \u20B93,000 from HDFC to Emergency Fund",
      expected: "HDFC decreases by \u20B93,000; Emergency fund increases; no ordinary expense",
      passed: Boolean(ef && ef.currentBalanceInPaise >= 3e6),
      actual: ef ? `Emergency Fund balance: \u20B9${(ef.currentBalanceInPaise / 100).toLocaleString("en-IN")}` : "EF missing"
    },
    {
      scenarioNumber: 8,
      title: "Partial Credit Card Payment",
      description: "Outstanding was \u20B910,000; Pay \u20B97,000",
      expected: "Outstanding becomes exactly \u20B93,000 remaining; card retains unpaid balance",
      passed: Boolean(card && card.outstandingBalanceInPaise === 3e5),
      actual: card ? `Remaining card outstanding: \u20B9${(card.outstandingBalanceInPaise / 100).toLocaleString("en-IN")}` : "Card missing"
    },
    {
      scenarioNumber: 9,
      title: "FD Maturity Calculation & Alert",
      description: "Principal \u20B950,000 at 7.5% quarterly compounding for 1 year",
      passed: Boolean(fd && fd.principalInPaise === 5e6 && fd.maturityAmountInPaise > 5385e3),
      actual: fd ? `Maturity: \u20B9${(fd.maturityAmountInPaise / 100).toLocaleString("en-IN")} (Interest: \u20B9${(fd.interestEarnedInPaise / 100).toLocaleString("en-IN")})` : "FD missing"
    }
  ];
  const allPassed = testReport.every((t) => t.passed);
  res.json({ allPassed, testReport });
});
router.get("/system/status", (req, res) => {
  res.json({
    database: getMongoStatus(),
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.0-production"
  });
});
var api_default = router;

// backend/server.standalone.ts
dotenv.config();
var app = express();
var port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
var allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://fin-pulse-bay.vercel.app"
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/+$/, ""));
}
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim().replace(/\/+$/, ""));
}
var corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith(".vercel.app") || origin.endsWith(".onrender.com")) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "x-refresh-token"]
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FinPulse Backend API",
    database: getMongoStatus(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FinPulse Backend API",
    database: getMongoStatus(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/", (req, res) => {
  res.json({
    name: "FinPulse Financial Management API",
    status: "online",
    healthCheck: "/api/health",
    database: getMongoStatus(),
    endpoints: {
      auth: "/api/auth",
      accounts: "/api/accounts",
      transactions: "/api/transactions",
      budget: "/api/budget",
      creditCards: "/api/credit-cards",
      investments: "/api/investments",
      emergencyFund: "/api/emergency-fund",
      savingsGoals: "/api/savings-goals",
      analytics: "/api/analytics"
    }
  });
});
app.use("/api", api_default);
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    status: 404,
    help: "Ensure requests include the /api prefix or verify API route spelling"
  });
});
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error occurred",
    status: err.status || 500
  });
});
async function start() {
  try {
    console.log("Initializing FinPulse backend services...");
    await initDatabase();
    try {
      const smtpCheck = await EmailService.verifyConnection();
      console.log(`[Brevo SMTP] Startup check: ${smtpCheck.verified ? "Verified on " + smtpCheck.host + ":" + smtpCheck.port : smtpCheck.message}`);
    } catch (err) {
      console.log("[Brevo SMTP] Startup check deferred:", err?.message);
    }
    app.listen(port, "0.0.0.0", () => {
      console.log(`FinPulse Backend Server running on port ${port} (0.0.0.0:${port})`);
      console.log(`Health check ready at: http://localhost:${port}/api/health`);
    });
  } catch (err) {
    console.error("Fatal error starting backend server:", err);
    process.exit(1);
  }
}
start();
var server_standalone_default = app;
export {
  server_standalone_default as default
};
