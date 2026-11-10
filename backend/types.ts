export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'credit_card_expense'
  | 'credit_card_payment'
  | 'cash_withdrawal'
  | 'cash_deposit'
  | 'investment_deposit'
  | 'emergency_deposit'
  | 'emergency_withdrawal'
  | 'savings_deposit';

export type MainCategory =
  | 'Essential'
  | 'Fun'
  | 'Investment'
  | 'Emergency Fund'
  | 'Savings'
  | 'Transfer'
  | 'Liability Settlement'
  | 'Other';

export type PaymentMethodType = 'Cash' | 'Bank Account' | 'Credit Card' | 'UPI';

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationOtp?: string;
  resetPasswordToken?: string;
  resetPasswordOtp?: string;
  resetPasswordExpires?: number;
  currency: string;
  monthlyBudgetInPaise: number;
  reminderDayOfMonth: number;
  emailNotificationsEnabled: boolean;
  accountStatus?: 'active' | 'locked';
  failedLoginAttempts?: number;
  lockUntil?: number | null;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  createdAt: string;
}

export interface IBankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountType: 'Savings' | 'Current' | 'Salary' | 'Other';
  accountNickname: string;
  accountNumberMasked: string;
  balanceInPaise: number;
  openingBalanceInPaise: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface ICashWallet {
  id: string;
  userId: string;
  balanceInPaise: number;
  notes?: string;
  updatedAt: string;
}

export interface ICreditCard {
  id: string;
  userId: string;
  cardName: string;
  bankName: string;
  cardNickname: string;
  lastFourDigits: string;
  creditLimitInPaise: number;
  outstandingBalanceInPaise: number;
  availableCreditInPaise: number;
  statementDay: number;
  dueDay: number;
  billingCycle: string;
  notes?: string;
  isActive: boolean;
  lastPaymentDate?: string;
  lastPaymentAmountInPaise?: number;
}

export interface ITransaction {
  id: string;
  userId: string;
  date: string;
  type: TransactionType;
  mainCategory: MainCategory;
  subCategory: string;
  customSubCategory?: string;
  amountInPaise: number;
  paymentMethod: PaymentMethodType;
  sourceAccountId?: string;
  destinationAccountId?: string;
  creditCardId?: string;
  description: string;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Reversed';
  createdAt: string;
}

export interface IBudgetAllocation {
  id: string;
  userId: string;
  monthYear: string; // e.g. "2026-11"
  essentialBudgetInPaise: number;
  funBudgetInPaise: number;
  investmentBudgetInPaise: number;
  emergencyBudgetInPaise: number;
  savingsBudgetInPaise: number;
  carryForwardEnabled: boolean;
}

export interface IInvestment {
  id: string;
  userId: string;
  name: string;
  type:
    | 'Fixed Deposit'
    | 'Recurring Deposit'
    | 'Mutual Funds'
    | 'Stocks'
    | 'Gold'
    | 'Bonds'
    | 'Other Investments';
  investedAmountInPaise: number;
  currentValueInPaise: number;
  investmentDate: string;
  durationMonths?: number;
  maturityDate?: string;
  expectedReturnRate?: number;
  riskLevel: 'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk';
  notes?: string;
}

export interface IFixedDeposit {
  id: string;
  userId: string;
  bankName: string;
  fdName: string;
  principalInPaise: number;
  interestRate: number; // percentage e.g. 7.5
  compoundingFrequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Annually';
  startDate: string;
  maturityDate: string;
  durationMonths: number;
  maturityAmountInPaise: number;
  interestEarnedInPaise: number;
  autoRenewal: boolean;
  status: 'Active' | 'Matured' | 'Closed';
  remindersSent: string[]; // e.g. ['30d', '7d', 'due']
}

export interface IEmergencyFund {
  id: string;
  userId: string;
  targetAmountInPaise: number;
  currentBalanceInPaise: number;
  updatedAt: string;
}

export interface ISavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmountInPaise: number;
  savedAmountInPaise: number;
  targetDate: string;
  monthlyContributionInPaise: number;
  notes?: string;
}

export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'bill_reminder' | 'fd_maturity' | 'budget_exceeded' | 'low_balance' | 'general' | 'system';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface IEmailLog {
  id: string;
  userId?: string;
  to: string;
  subject: string;
  htmlBody: string;
  previewText: string;
  sentAt: string;
  status: 'sent' | 'simulated';
  triggerType: 'verification' | 'password_reset' | 'cc_bill_reminder' | 'fd_maturity_reminder' | 'monthly_summary';
  metadata?: {
    token?: string;
    otp?: string;
    actionUrl?: string;
  };
}

export interface IRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface IEmailVerification {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  lastSentAt: number;
  createdAt: string;
}
