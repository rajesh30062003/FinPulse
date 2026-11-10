# Smart Personal Finance & Money Management System

A production-grade, full-stack personal finance management web application featuring atomic double-entry ledger calculations, automated email verification and secure password recovery, credit card liability lifecycle management, investments and FD tracking with maturity alerts, and financial analytics.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following critical architectural decisions have been confirmed from your responses:
> - **Automated Email Service**: Configured with a full automated email pipeline (verification links, password reset tokens, monthly statements, credit card due reminders, FD maturity alerts) paired with an in-app interactive Sandbox Mailbox Viewer to instantly inspect and test emails, alongside custom SMTP server credentials support.
> - **Database Strategy**: Production MongoDB Atlas architecture with Mongoose schemas, indexes, and atomic transactions, coupled with an automatic fallback storage engine so the app is immediately operational in AI Studio and seamlessly connects to your Atlas cluster URI.
> - **Pre-Seeded Financial Suite**: Ships with realistic demo records pre-configured for all 9 mandatory financial test scenarios (HDFC/SBI accounts, cash wallet, credit cards, mutual funds, emergency fund, and fixed deposits) with one-click data reset and full manual CRUD capabilities.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an intelligent, mathematically rigorous personal finance management hub where every rupee is accounted for. Handles salary inflows, dynamic budget allocations (Essential, Fun, Investment, Emergency Fund, Savings), cash and multi-bank operations, credit card expense-vs-liability settlements, emergency fund targets, investment valuation, and automated email reminders.
- **Target Audience / Persona**: Individuals, working professionals, and households seeking exact financial clarity, disciplined allocation, zero double-counting of liabilities or transfers, and automated schedule reminders.
- **Key Value**: Enforces financial ledger consistency: credit card purchases record expenses immediately while bill payments settle liabilities without duplicate expense counting; bank-to-bank transfers and cash withdrawals shift balances without distorting income or expenditure reports.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Authentication & Verification*: Registration triggers an automated email verification dispatch with token link; users verify via link or the in-app Sandbox Mailbox Viewer. A secure "Forgot Password" recovery flow issues signed reset tokens with expiry.
  2. *Quick Financial Inflow & Allocation*: Adding income (Salary, Freelancing, etc.) automatically deposits to the selected bank account and prompts category allocation into Essential, Fun, Investment, Emergency, and Savings.
  3. *Daily Expense & Payment Method Dispatch*: Adding an expense adjusts Essential or Fun allocations; paying by Cash decreases cash balance, paying by Bank decreases bank balance, and paying by Credit Card increases card liability without immediately draining bank balance.
  4. *Credit Card Liability Settlement*: Dedicated bill payment screen allows full or partial settlement from any bank account, directly lowering card balance and updating available credit without creating duplicate expenses.
  5. *Investments & FD Lifecycle*: Tracking mutual funds and stocks with manual valuation updates; FD compounding calculator with countdown to maturity and automated email/in-app notices (30 days, 7 days, maturity).
  6. *Reports & Analytics*: Interactive Recharts suite showing expense distributions, income vs. expense bars, budget utilization donuts, and account distribution with CSV/PDF exports.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Professional, high-density fintech dashboard inspired by modern institutional banking platforms.
  - *Color Palette & Tokens*: Deep navy brand accents (`#0F172A`, `#1E293B`, `#2563EB`), emerald green (`#16A34A`) for positive inflows and nominal states, warm amber (`#D97706`) for budget alerts and approaching bills, crimson (`#DC2626`) for debt liabilities and overdue items. Canvas is crisp neutral (`#F8FAFC` light / `#0B0F17` dark).
  - *Typography & Tabular Figures*: Paired `Plus Jakarta Sans` for clean display and structured navigation, `Public Sans` for crisp UI labels, and `font-mono tabular-nums` for all financial figures, currencies, and timestamps.
  - *Zero-Pill Discipline*: Unboxed text metadata with subtle typographic separators (`·` or `/`); interactive filters implemented as clean segmented button controls.

---

### 3. Key Product Decisions & Trade-Offs

- **Financial Ledger & State Integrity**:
  - *Chosen Approach*: Atomic double-entry transaction engine where account balances and allocations are computed and validated through structured ledger entries. Monetary values are computed with integer paise precision to eliminate floating-point rounding errors.
  - *Why*: Guarantees that bank transfers, cash withdrawals, credit card bill payments, and investment deposits never register as false expenses or double-counted incomes.
- **Dual-Mode Persistence (MongoDB Atlas + Resilient Fallback)**:
  - *Chosen Approach*: The backend connects to MongoDB Atlas via Mongoose when `MONGODB_URI` is supplied, while maintaining an active in-process JSON store if the connection is pending, ensuring zero downtime in the preview sandbox.
  - *Why*: Allows immediate evaluation and testing in AI Studio while fulfilling full production deployment requirements for Render/Vercel.
- **Automated Email & Sandbox Mailbox System**:
  - *Chosen Approach*: Dual-layer email architecture utilizing Nodemailer for live SMTP delivery alongside an in-app interactive mailbox modal that intercepts and displays all outgoing HTML emails, tokens, and alert payloads in real-time.
  - *Why*: Delivers 100% testability of email verification, password reset, and reminder cron jobs directly within the browser without requiring third-party inbox access.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                         │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   Sidebar Navigation  │  │  Top Bar (User Menu, Mailbox, Theme)   │ │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘ │
│              │                                  │                      │
│  ┌───────────▼──────────────────────────────────▼────────────────────┐ │
│  │ Active View: Dashboard | Add Transaction | Income | Expenses      │ │
│  │ Bank Accounts | Credit Cards & Bills | Investments & FDs          │ │
│  │ Emergency & Savings | Analytics & Reports | Email Sandbox         │ │
│  └───────────────────────────────────┬───────────────────────────────┘ │
│                                      │ Axios REST API Requests         │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Express + Node.js API)                     │
│  ┌────────────────────────┐  ┌───────────────────────────────────────┐ │
│  │ Auth & JWT Middleware  │  │ Ledger & Calculation Service (Atomic) │ │
│  └───────────┬────────────┘  └───────────────────┬───────────────────┘ │
│              │                                   │                     │
│  ┌───────────▼────────────┐  ┌───────────────────▼───────────────────┐ │
│  │ Schedulers & Reminders │  │ Nodemailer Service + Sandbox Mailbox  │ │
│  │ (Node Cron Jobs)       │  │ (Verification, Resets, Bill Reminders)│ │
│  └───────────┬────────────┘  └───────────────────┬───────────────────┘ │
└──────────────┼───────────────────────────────────┼─────────────────────┘
               │                                   │
┌──────────────▼───────────────────────────────────▼─────────────────────┐
│                 DATA LAYER (MongoDB Atlas / Fallback)                  │
│   Users · BankAccounts · CashWallets · CreditCards · Transactions      │
│   BudgetAllocations · Investments · FixedDeposits · SavingsGoals       │
│   Notifications · EmailLogs · AuditLedger                              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities
1. **User**: Credentials, password hash (`bcrypt`), verified status, verification tokens, reset tokens with expiry.
2. **Account / CashWallet**: Bank details, masked account number, balance in paise, active state.
3. **CreditCard**: Card nickname, limit, outstanding balance, statement date, due date, billing cycle.
4. **Transaction & LedgerEntry**: Atomic record of amount, source/destination accounts, category, transaction type (`income`, `expense`, `transfer`, `cc_expense`, `cc_bill_payment`, `investment_deposit`, `emergency_deposit`), timestamp, and note.
5. **BudgetAllocation**: Monthly category budgets (Essential, Fun, Investment, Emergency, Savings) tracking allocated, spent, and remaining balances.
6. **Investment & FixedDeposit**: Asset classes, principal, current market value, interest rates, compounding frequency, maturity schedule, risk tier.
7. **SavingsGoal & EmergencyFund**: Target amounts, accumulated funds, target completion dates.
8. **Notification & EmailLog**: In-app unread alerts and full historical email logs with template payloads.

#### Component & Interactive State Mapping
- `DashboardView`: Aggregates real-time financial cards (Available money, Bank total, Cash, Credit Card outstanding, Monthly income/expense, remaining budget) with quick-action shortcuts.
- `TransactionModal / AddTransactionView`: Strict dynamic form validating source accounts, category vs. payment method compatibility, and custom subcategory inputs.
- `CreditCardManager & BillPaymentModal`: Displays card health, calculates `available_credit = limit - outstanding`, and executes bill settlements without duplicate expense generation.
- `MailboxSandboxModal`: Slide-out panel inspecting all sent emails (verification, password resets, reminders) with direct test-action buttons.
- `AnalyticsView`: Multi-filter time engine (Daily, Weekly, Monthly, Quarterly, Yearly) powering Recharts breakdowns and CSV export.
- `ScenarioTesterWidget`: Floating developer toolbar enabling 1-click execution and verification of all 9 mandatory financial scenarios.
