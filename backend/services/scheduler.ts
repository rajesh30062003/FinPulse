import cron from 'node-cron';
import { getDb, saveDatabase } from '../db.js';
import { EmailService } from './emailService.js';
import { INotification } from '../types.js';

export class SchedulerService {
  private static cronTasks: any[] = [];

  static startScheduledJobs() {
    // 1. Run daily at 09:00 AM for CC bills, FD maturities, and budget thresholds
    const dailyJob = cron.schedule('0 9 * * *', async () => {
      console.log('Running daily financial reminder checks...');
      await this.runChecks();
    });

    this.cronTasks.push(dailyJob);
    console.log('Automated financial scheduler initialized with Node Cron.');
  }

  static async runChecks(specificUserId?: string) {
    const db = getDb();
    const users = specificUserId ? db.users.filter(u => u.id === specificUserId) : db.users;

    const now = new Date();
    const todayDay = now.getDate();
    const todayIso = now.toISOString();

    for (const user of users) {
      // 1. Check Credit Card Bills
      const userCards = db.creditCards.filter(c => c.userId === user.id && c.isActive);
      for (const card of userCards) {
        if (card.outstandingBalanceInPaise > 0) {
          // Check if due soon or today is reminder day (25th default)
          const isReminderDay = todayDay === (user.reminderDayOfMonth || 25);
          const daysToDue = card.dueDay >= todayDay ? card.dueDay - todayDay : 30 - (todayDay - card.dueDay);

          if (isReminderDay || daysToDue <= 3) {
            // Avoid spamming duplicate notifications within the last 24h
            const recentNotif = db.notifications.find(
              n => n.userId === user.id && n.type === 'bill_reminder' && n.metadata?.cardId === card.id &&
              new Date(n.createdAt).getTime() > Date.now() - 24 * 3600000
            );

            if (!recentNotif) {
              const formattedAmt = (card.outstandingBalanceInPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
              const notif: INotification = {
                id: `notif-bill-${Date.now()}-${card.id}`,
                userId: user.id,
                title: `Credit Card Bill Reminder: ${card.cardName}`,
                message: `Outstanding balance of ${formattedAmt} is due on the ${card.dueDay}th. Settle to avoid interest.`,
                type: 'bill_reminder',
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

      // 2. Check Fixed Deposit Maturities
      const userFDs = db.fixedDeposits.filter(f => f.userId === user.id && f.status === 'Active');
      for (const fd of userFDs) {
        const matDate = new Date(fd.maturityDate);
        const diffMs = matDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          const reminderTag = diffDays <= 1 ? 'due' : diffDays <= 7 ? '7d' : '30d';

          if (!fd.remindersSent.includes(reminderTag)) {
            fd.remindersSent.push(reminderTag);
            const notif: INotification = {
              id: `notif-fd-${Date.now()}-${fd.id}`,
              userId: user.id,
              title: `FD Maturity Alert: ${fd.fdName}`,
              message: `Your FD with ${fd.bankName} matures in ${diffDays} day(s) on ${matDate.toLocaleDateString()}. Expected payout: ${(fd.maturityAmountInPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}.`,
              type: 'fd_maturity',
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

      // 3. Low Bank Balance Warnings
      const accounts = db.bankAccounts.filter(a => a.userId === user.id && a.isActive);
      for (const acc of accounts) {
        if (acc.balanceInPaise < 200000) { // < ₹2,000 threshold
          const exists = db.notifications.find(
            n => n.userId === user.id && n.type === 'low_balance' && n.metadata?.accountId === acc.id &&
            new Date(n.createdAt).getTime() > Date.now() - 48 * 3600000
          );
          if (!exists) {
            db.notifications.unshift({
              id: `notif-bal-${Date.now()}-${acc.id}`,
              userId: user.id,
              title: `Low Balance Alert: ${acc.bankName}`,
              message: `${acc.accountNickname} balance is currently ${(acc.balanceInPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}.`,
              type: 'low_balance',
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
}
