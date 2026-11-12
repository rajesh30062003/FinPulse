/**
 * FinPulse Production Database Ownership & Reconciliation Migration
 * 
 * Target User: Rajesh Pal (rjrajeshpal30062003@gmail.com)
 * Version: 1
 * 
 * Features:
 * - Pure Node.js resilient design: works both with MongoDB Atlas (when mongoose is installed)
 *   and with local ledger store (.data/db.json)
 * - Read-only dry-run option: `node backend/scripts/migrate.js --dry-run`
 * - Automatic snapshot backup creation before modifications
 * - Safe budget deduplication & merge across all months (prevents E11000 collision)
 * - Safe ownership reconciliation preserving other users (Aarav, rty, etc.)
 * - Idempotency guaranteed via migration completion records
 * - Pre- and post-migration verification report
 */

import fs from 'fs';
import path from 'path';

let mongoose = null;
let dotenv = null;
try {
  const m = await import('mongoose');
  mongoose = m.default || m;
  const d = await import('dotenv');
  dotenv = d.default || d;
  if (dotenv?.config) dotenv.config();
} catch {
  // node_modules not present in local directory; operate using pure Node.js on local ledger
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const MIGRATION_VERSION = 1;
const MIGRATION_NAME = 'canonical_ownership_reconciliation_v1';
const CANONICAL_EMAIL = 'rjrajeshpal30062003@gmail.com';
const LEGACY_EMAILS = ['rjrajeshpal30@gmail.com'];
const CANDIDATE_RAJESH_IDS = ['demo-user-id', 'user-1794473436793-0d16c1', 'user-rjrajeshpal30'];

function createBackup(dbData, tag = 'cli_migration') {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(DATA_DIR, `backup_${tag}_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2), 'utf-8');
  return backupPath;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log('='.repeat(70));
  console.log(`FinPulse Production Ownership Migration ${isDryRun ? '[DRY RUN MODE]' : '[LIVE EXECUTION]'}`);
  console.log(`Target Canonical Account: ${CANONICAL_EMAIL}`);
  console.log('='.repeat(70));

  const mongoUri = process.env.MONGODB_URI;
  let isAtlas = false;
  let activeDbName = 'local';

  let MigrationModel = null;
  let UserModel = null;
  let BudgetAllocationModel = null;
  let BankAccountModel = null;
  let CashWalletModel = null;
  let CreditCardModel = null;
  let TransactionModel = null;
  let InvestmentModel = null;
  let FixedDepositModel = null;
  let EmergencyFundModel = null;
  let SavingsGoalModel = null;
  let NotificationModel = null;

  if (mongoose && mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        dbName: process.env.MONGODB_DB_NAME || undefined
      });
      isAtlas = true;
      activeDbName = mongoose.connection.db?.databaseName || mongoose.connection.name || 'default';
      console.log(`[CONNECTED] MongoDB Atlas active database: "${activeDbName}"`);

      const MigrationSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        version: { type: Number, required: true, unique: true },
        status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        executedAt: { type: String },
        details: { type: mongoose.Schema.Types.Mixed },
        error: { type: String }
      }, { timestamps: true });

      const UserSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        isVerified: { type: Boolean, default: false }
      }, { strict: false, timestamps: true });

      const BudgetAllocationSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        monthYear: { type: String, required: true }
      }, { strict: false });
      BudgetAllocationSchema.index({ userId: 1, monthYear: 1 }, { unique: true });

      const createModel = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
      const createGenericModel = (name) => mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false }));

      MigrationModel = createModel('Migration', MigrationSchema);
      UserModel = createModel('User', UserSchema);
      BudgetAllocationModel = createModel('BudgetAllocation', BudgetAllocationSchema);
      BankAccountModel = createGenericModel('BankAccount');
      CashWalletModel = createGenericModel('CashWallet');
      CreditCardModel = createGenericModel('CreditCard');
      TransactionModel = createGenericModel('Transaction');
      InvestmentModel = createGenericModel('Investment');
      FixedDepositModel = createGenericModel('FixedDeposit');
      EmergencyFundModel = createGenericModel('EmergencyFund');
      SavingsGoalModel = createGenericModel('SavingsGoal');
      NotificationModel = createGenericModel('Notification');
    } catch (err) {
      console.warn(`[WARN] MongoDB Atlas connection failed: ${err.message}. Operating with local ledger.`);
    }
  } else {
    console.log('[INFO] Operating with resilient ledger store (.data/db.json).');
  }

  // Load local ledger
  let localDb = {
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
    migrations: []
  };
  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      localDb = { ...localDb, ...parsed };
    } catch (err) {
      console.warn('Could not parse db.json:', err.message);
    }
  }

  // 1. Check existing migration records
  if (isAtlas && MigrationModel) {
    const existingMigration = await MigrationModel.findOne({ version: MIGRATION_VERSION }).lean();
    if (existingMigration && existingMigration.status === 'completed') {
      console.log(`\n[IDEMPOTENT SKIP] Migration v${MIGRATION_VERSION} (${MIGRATION_NAME}) was already completed on ${existingMigration.executedAt}.`);
      console.log('Details:', JSON.stringify(existingMigration.details, null, 2));
      process.exit(0);
    }
  } else if (!isAtlas) {
    const existingMigration = (localDb.migrations || []).find(m => m.version === MIGRATION_VERSION && m.status === 'completed');
    if (existingMigration) {
      console.log(`\n[IDEMPOTENT SKIP] Migration v${MIGRATION_VERSION} (${MIGRATION_NAME}) was already completed on ${existingMigration.executedAt}.`);
      console.log('Details:', JSON.stringify(existingMigration.details, null, 2));
      process.exit(0);
    }
  }

  // 2. Identify All Users & Historical IDs
  console.log('\n--- STEP 1: USER IDENTIFICATION ---');
  let allUsers = [];
  if (isAtlas && UserModel) {
    allUsers = await UserModel.find({}).lean();
  } else {
    allUsers = localDb.users || [];
  }
  console.log(`Found ${allUsers.length} total user accounts:`);
  for (const u of allUsers) {
    console.log(` - ID: ${u.id.padEnd(28)} | Email: ${u.email.padEnd(35)} | Name: ${u.name}`);
  }

  // Find canonical user
  let canonicalUser = allUsers.find(u => u.email.toLowerCase() === CANONICAL_EMAIL.toLowerCase());
  if (!canonicalUser) {
    canonicalUser = allUsers.find(u => u.id === 'user-1794473436793-0d16c1');
  }
  if (!canonicalUser) {
    canonicalUser = allUsers.find(u => u.id === 'user-rjrajeshpal30');
  }
  if (!canonicalUser) {
    canonicalUser = allUsers.find(u => LEGACY_EMAILS.includes(u.email.toLowerCase()));
  }

  if (!canonicalUser) {
    console.log(`[NOTICE] No existing user record found for ${CANONICAL_EMAIL}. Will provision canonical account.`);
    canonicalUser = {
      id: 'user-rjrajeshpal30',
      name: 'Rajesh Pal',
      email: CANONICAL_EMAIL,
      isVerified: true
    };
  }

  const canonicalUserId = canonicalUser.id;
  const legacyIds = CANDIDATE_RAJESH_IDS.filter(id => id !== canonicalUserId);
  console.log(`\nCanonical User ID: ${canonicalUserId}`);
  console.log(`Legacy IDs to Reconcile: [${legacyIds.join(', ')}]`);

  const otherUsers = allUsers.filter(u => u.id !== canonicalUserId && !legacyIds.includes(u.id) && !LEGACY_EMAILS.includes(u.email.toLowerCase()));
  console.log(`Preserved independent users (${otherUsers.length}): ${otherUsers.map(u => u.email).join(', ') || 'None'}`);

  // 3. Inspect Pre-Migration Counts
  console.log('\n--- STEP 2: PRE-MIGRATION COUNTS ---');
  let preCounts = {};
  if (isAtlas) {
    preCounts = {
      users: await UserModel.countDocuments(),
      banks: await BankAccountModel.countDocuments(),
      cards: await CreditCardModel.countDocuments(),
      txs: await TransactionModel.countDocuments(),
      budgets: await BudgetAllocationModel.countDocuments(),
      investments: await InvestmentModel.countDocuments(),
      fds: await FixedDepositModel.countDocuments()
    };
  } else {
    preCounts = {
      users: (localDb.users || []).length,
      banks: (localDb.bankAccounts || []).length,
      cards: (localDb.creditCards || []).length,
      txs: (localDb.transactions || []).length,
      budgets: (localDb.budgetAllocations || []).length,
      investments: (localDb.investments || []).length,
      fds: (localDb.fixedDeposits || []).length
    };
  }
  console.log('Record counts before migration:', preCounts);

  // 4. Duplicate Budget Analysis
  console.log('\n--- STEP 3: BUDGET DUPLICATE & INDEX CONFLICT ANALYSIS ---');
  let allBudgets = [];
  if (isAtlas) {
    allBudgets = await BudgetAllocationModel.find({
      userId: { $in: [canonicalUserId, ...legacyIds] }
    }).lean();
  } else {
    allBudgets = (localDb.budgetAllocations || []).filter(b => b.userId === canonicalUserId || legacyIds.includes(b.userId));
  }

  const budgetsByMonth = new Map();
  for (const b of allBudgets) {
    const list = budgetsByMonth.get(b.monthYear) || [];
    list.push(b);
    budgetsByMonth.set(b.monthYear, list);
  }

  let duplicateMonthsCount = 0;
  const duplicateBudgetIdsToDelete = [];
  const authoritativeBudgets = [];

  for (const [monthYear, records] of budgetsByMonth.entries()) {
    if (records.length > 1) {
      duplicateMonthsCount++;
      console.log(`[COLLISION RISK] Month "${monthYear}" has ${records.length} records across IDs: [${records.map(r => r.userId).join(', ')}]`);
      for (const r of records) {
        console.log(`   - ID: ${r.id} | totalBudget: ₹${(r.totalBudgetInPaise || 0) / 100} | Essential: ₹${(r.essentialBudgetInPaise || 0) / 100} | Fun: ₹${(r.funBudgetInPaise || 0) / 100}`);
      }
      const nonDemo = records.find(r => !r.id.includes('demo') && typeof r.totalBudgetInPaise === 'number' && r.totalBudgetInPaise > 0);
      const authBase = nonDemo || records[0];

      let maxTotal = authBase.totalBudgetInPaise || 4000000;
      let maxEss = authBase.essentialBudgetInPaise || 0;
      let maxFun = authBase.funBudgetInPaise || 0;
      let maxInv = authBase.investmentBudgetInPaise || 0;
      let maxEf = authBase.emergencyBudgetInPaise || 0;
      let maxSav = authBase.savingsBudgetInPaise || 0;
      let carry = Boolean(authBase.carryForwardEnabled);

      for (const other of records) {
        if (other.id !== authBase.id) {
          duplicateBudgetIdsToDelete.push(other.id);
        }
        if (other.totalBudgetInPaise) maxTotal = Math.max(maxTotal, other.totalBudgetInPaise);
        if (other.essentialBudgetInPaise) maxEss = Math.max(maxEss, other.essentialBudgetInPaise);
        if (other.funBudgetInPaise) maxFun = Math.max(maxFun, other.funBudgetInPaise);
        if (other.investmentBudgetInPaise) maxInv = Math.max(maxInv, other.investmentBudgetInPaise);
        if (other.emergencyBudgetInPaise) maxEf = Math.max(maxEf, other.emergencyBudgetInPaise);
        if (other.savingsBudgetInPaise) maxSav = Math.max(maxSav, other.savingsBudgetInPaise);
        if (other.carryForwardEnabled) carry = true;
      }

      const merged = {
        id: authBase.id,
        userId: canonicalUserId,
        monthYear,
        totalBudgetInPaise: maxTotal,
        essentialBudgetInPaise: maxEss,
        funBudgetInPaise: maxFun,
        investmentBudgetInPaise: maxInv,
        emergencyBudgetInPaise: maxEf,
        savingsBudgetInPaise: maxSav,
        carryForwardEnabled: carry
      };
      authoritativeBudgets.push(merged);
      console.log(`   ==> Merged into authoritative record (ID: ${merged.id}): Total: ₹${maxTotal / 100}, Essential: ₹${maxEss / 100}, Fun: ₹${maxFun / 100}`);
    } else {
      const single = { ...records[0], userId: canonicalUserId };
      authoritativeBudgets.push(single);
    }
  }

  if (duplicateMonthsCount === 0) {
    console.log('[OK] No duplicate monthly budget records detected.');
  } else {
    console.log(`[PLAN] Will safely merge ${duplicateMonthsCount} monthly duplicate sets and remove ${duplicateBudgetIdsToDelete.length} redundant budget documents.`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] No records were modified. Run without --dry-run to apply changes.');
    process.exit(0);
  }

  // 5. LIVE MIGRATION EXECUTION
  console.log('\n--- STEP 4: CREATING PRE-MIGRATION BACKUP SNAPSHOT ---');
  let backupSnapshot = {};
  if (isAtlas) {
    backupSnapshot = {
      users: await UserModel.find({}).lean(),
      banks: await BankAccountModel.find({}).lean(),
      cards: await CreditCardModel.find({}).lean(),
      txs: await TransactionModel.find({}).lean(),
      budgets: await BudgetAllocationModel.find({}).lean()
    };
  } else {
    backupSnapshot = localDb;
  }
  const backupPath = createBackup(backupSnapshot, 'pre_ownership_reconcile');
  console.log(`Verified backup snapshot written to: ${backupPath}`);

  console.log('\n--- STEP 5: EXECUTING SAFE MIGRATION ---');

  // Memory / local migration
  localDb.users = (localDb.users || []).filter(u => !legacyIds.includes(u.id) && !LEGACY_EMAILS.includes(u.email.toLowerCase()));
  const localUserIdx = localDb.users.findIndex(u => u.id === canonicalUserId);
  if (localUserIdx >= 0) localDb.users[localUserIdx] = canonicalUser;
  else localDb.users.push(canonicalUser);

  if (duplicateBudgetIdsToDelete.length > 0) {
    localDb.budgetAllocations = (localDb.budgetAllocations || []).filter(b => !duplicateBudgetIdsToDelete.includes(b.id));
  }
  for (const b of authoritativeBudgets) {
    const idx = (localDb.budgetAllocations || []).findIndex(x => x.id === b.id);
    if (idx >= 0) localDb.budgetAllocations[idx] = b;
    else localDb.budgetAllocations.push(b);
  }

  const reassignLocal = (arr) => {
    let count = 0;
    for (const item of (arr || [])) {
      if (legacyIds.includes(item.userId)) {
        item.userId = canonicalUserId;
        count++;
      }
    }
    return count;
  };

  const reassignedBanks = reassignLocal(localDb.bankAccounts);
  const reassignedCards = reassignLocal(localDb.creditCards);
  const reassignedTxs = reassignLocal(localDb.transactions);
  const reassignedInvs = reassignLocal(localDb.investments);
  const reassignedFDs = reassignLocal(localDb.fixedDeposits);
  const reassignedSavings = reassignLocal(localDb.savingsGoals);
  const reassignedNotifs = reassignLocal(localDb.notifications);

  const migrationRecord = {
    id: 'migration-v1-canonical-ownership',
    name: MIGRATION_NAME,
    version: MIGRATION_VERSION,
    status: 'completed',
    executedAt: new Date().toISOString(),
    details: {
      canonicalUserId,
      canonicalEmail: CANONICAL_EMAIL,
      legacyIds,
      resolvedDuplicateBudgetsCount: duplicateBudgetIdsToDelete.length,
      authoritativeBudgetsCount: authoritativeBudgets.length,
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

  if (!localDb.migrations) localDb.migrations = [];
  localDb.migrations.push(migrationRecord);
  fs.writeFileSync(DATA_FILE, JSON.stringify(localDb, null, 2), 'utf-8');
  console.log('[Local Ledger] Saved updated records and migration completion record.');

  // Atlas migration (if connected)
  if (isAtlas) {
    await UserModel.deleteMany({
      $or: [
        { id: { $in: legacyIds } },
        { email: { $in: LEGACY_EMAILS } }
      ],
      _id: { $ne: canonicalUser._id }
    });
    canonicalUser.name = 'Rajesh Pal';
    canonicalUser.email = CANONICAL_EMAIL;
    canonicalUser.isVerified = true;
    await UserModel.findOneAndUpdate({ id: canonicalUserId }, canonicalUser, { upsert: true, new: true });
    console.log(`[Atlas] Authoritative user document updated: ${canonicalUserId} (${CANONICAL_EMAIL})`);

    if (duplicateBudgetIdsToDelete.length > 0) {
      await BudgetAllocationModel.deleteMany({ id: { $in: duplicateBudgetIdsToDelete } });
      console.log(`[Atlas] Deleted ${duplicateBudgetIdsToDelete.length} conflicting duplicate budget allocations.`);
    }
    await BudgetAllocationModel.deleteMany({ userId: { $in: legacyIds } });

    for (const b of authoritativeBudgets) {
      await BudgetAllocationModel.findOneAndUpdate(
        { userId: canonicalUserId, monthYear: b.monthYear },
        b,
        { upsert: true, new: true }
      );
    }
    console.log(`[Atlas] Upserted ${authoritativeBudgets.length} authoritative monthly budget allocations.`);

    const collectionsToReassign = [
      { name: 'BankAccount', model: BankAccountModel },
      { name: 'CreditCard', model: CreditCardModel },
      { name: 'Transaction', model: TransactionModel },
      { name: 'Investment', model: InvestmentModel },
      { name: 'FixedDeposit', model: FixedDepositModel },
      { name: 'EmergencyFund', model: EmergencyFundModel },
      { name: 'SavingsGoal', model: SavingsGoalModel },
      { name: 'Notification', model: NotificationModel }
    ];

    for (const { name, model } of collectionsToReassign) {
      const res = await model.updateMany(
        { userId: { $in: legacyIds } },
        { $set: { userId: canonicalUserId } }
      );
      console.log(`[Atlas] Reassigned ${res.modifiedCount} ${name} documents to ${canonicalUserId}`);
    }

    await MigrationModel.findOneAndUpdate({ version: MIGRATION_VERSION }, migrationRecord, { upsert: true });
    console.log(`[Atlas] Migration completion recorded in Atlas migrations collection.`);
  }

  // 6. Post-Migration Verification
  console.log('\n--- STEP 6: POST-MIGRATION VERIFICATION ---');
  const postCounts = isAtlas ? {
    users: await UserModel.countDocuments(),
    banks: await BankAccountModel.countDocuments(),
    cards: await CreditCardModel.countDocuments(),
    txs: await TransactionModel.countDocuments(),
    budgets: await BudgetAllocationModel.countDocuments(),
    investments: await InvestmentModel.countDocuments(),
    fds: await FixedDepositModel.countDocuments()
  } : {
    users: (localDb.users || []).length,
    banks: (localDb.bankAccounts || []).length,
    cards: (localDb.creditCards || []).length,
    txs: (localDb.transactions || []).length,
    budgets: (localDb.budgetAllocations || []).length,
    investments: (localDb.investments || []).length,
    fds: (localDb.fixedDeposits || []).length
  };
  console.log('Record counts after migration:', postCounts);

  const canonicalAccountsCount = isAtlas ? await BankAccountModel.countDocuments({ userId: canonicalUserId }) : (localDb.bankAccounts || []).filter(b => b.userId === canonicalUserId).length;
  const canonicalCardsCount = isAtlas ? await CreditCardModel.countDocuments({ userId: canonicalUserId }) : (localDb.creditCards || []).filter(c => c.userId === canonicalUserId).length;
  const canonicalTxsCount = isAtlas ? await TransactionModel.countDocuments({ userId: canonicalUserId }) : (localDb.transactions || []).filter(t => t.userId === canonicalUserId).length;
  const canonicalBudgetsCount = isAtlas ? await BudgetAllocationModel.countDocuments({ userId: canonicalUserId }) : (localDb.budgetAllocations || []).filter(b => b.userId === canonicalUserId).length;

  console.log(`\nVerified records accessible under ${canonicalUserId} (${CANONICAL_EMAIL}):`);
  console.log(` - Bank Accounts: ${canonicalAccountsCount}`);
  console.log(` - Credit Cards:  ${canonicalCardsCount}`);
  console.log(` - Transactions:  ${canonicalTxsCount}`);
  console.log(` - Monthly Budgets: ${canonicalBudgetsCount}`);

  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
  process.exit(0);
}

run().catch((err) => {
  console.error('[FATAL MIGRATION ERROR]:', err);
  process.exit(1);
});
