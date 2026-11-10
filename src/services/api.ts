export const API_BASE = '/api';

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('finpulse_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function formatINR(paise: number, showDecimals: boolean = false): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function formatNumberINR(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export const api = {
  // Auth
  async login(payload: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async register(payload: { name: string; email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async verifyEmail(payload: { email: string; token?: string; otp?: string }) {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Verification failed');
    }
    return res.json();
  },

  async resendVerification(email: string) {
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Resend failed');
    return res.json();
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Password reset request failed');
    return res.json();
  },

  async resetPassword(payload: { email: string; token?: string; otp?: string; newPassword: string }) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Reset failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async updateProfile(data: any) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Dashboard
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard/summary`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  // Accounts
  async getAccounts() {
    const res = await fetch(`${API_BASE}/accounts`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createAccount(data: any) {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create account');
    return res.json();
  },

  // Cash
  async getCash() {
    const res = await fetch(`${API_BASE}/cash`, { headers: getAuthHeaders() });
    return res.json();
  },

  async adjustCash(data: { newBalanceInPaise: number; reason: string }) {
    const res = await fetch(`${API_BASE}/cash/adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Credit Cards
  async getCreditCards() {
    const res = await fetch(`${API_BASE}/credit-cards`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createCreditCard(data: any) {
    const res = await fetch(`${API_BASE}/credit-cards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create credit card');
    return res.json();
  },

  async payCreditCardBill(data: { creditCardId: string; sourceAccountId: string; paymentAmountInPaise: number; notes?: string }) {
    const res = await fetch(`${API_BASE}/credit-cards/pay-bill`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Bill payment failed');
    }
    return res.json();
  },

  // Transactions
  async getTransactions(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/transactions${q}`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createTransaction(data: any) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record transaction');
    }
    return res.json();
  },

  async updateTransaction(id: string, data: any) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update transaction');
    }
    return res.json();
  },

  async deleteTransaction(id: string) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Budget
  async getBudget() {
    const res = await fetch(`${API_BASE}/budget`, { headers: getAuthHeaders() });
    return res.json();
  },

  async updateBudget(data: any) {
    const res = await fetch(`${API_BASE}/budget`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Investments
  async getInvestments() {
    const res = await fetch(`${API_BASE}/investments`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createInvestment(data: any) {
    const res = await fetch(`${API_BASE}/investments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateInvestmentValuation(id: string, currentValueInPaise: number) {
    const res = await fetch(`${API_BASE}/investments/${id}/valuation`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentValueInPaise })
    });
    return res.json();
  },

  async deleteInvestment(id: string) {
    const res = await fetch(`${API_BASE}/investments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Fixed Deposits
  async getFixedDeposits() {
    const res = await fetch(`${API_BASE}/fixed-deposits`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createFixedDeposit(data: any) {
    const res = await fetch(`${API_BASE}/fixed-deposits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteFixedDeposit(id: string) {
    const res = await fetch(`${API_BASE}/fixed-deposits/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Emergency Fund
  async getEmergencyFund() {
    const res = await fetch(`${API_BASE}/emergency-fund`, { headers: getAuthHeaders() });
    return res.json();
  },

  async updateEmergencyTarget(targetAmountInPaise: number) {
    const res = await fetch(`${API_BASE}/emergency-fund/target`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetAmountInPaise })
    });
    return res.json();
  },

  async depositEmergencyFund(data: { amountInPaise: number; sourceAccountId: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/emergency-fund/deposit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async withdrawEmergencyFund(data: { amountInPaise: number; destinationAccountId: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/emergency-fund/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Savings
  async getSavingsGoals() {
    const res = await fetch(`${API_BASE}/savings-goals`, { headers: getAuthHeaders() });
    return res.json();
  },

  async createSavingsGoal(data: any) {
    const res = await fetch(`${API_BASE}/savings-goals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async contributeSavingsGoal(id: string, data: { amountInPaise: number; sourceAccountId: string }) {
    const res = await fetch(`${API_BASE}/savings-goals/${id}/contribute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteSavingsGoal(id: string) {
    const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeaders() });
    return res.json();
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async triggerReminderCheck() {
    const res = await fetch(`${API_BASE}/notifications/trigger-check`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Mailbox
  async getMailbox() {
    const res = await fetch(`${API_BASE}/mailbox`);
    return res.json();
  },

  async sendTestMail(type: string) {
    const res = await fetch(`${API_BASE}/mailbox/test-send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type })
    });
    return res.json();
  },

  async clearMailbox() {
    const res = await fetch(`${API_BASE}/mailbox`, { method: 'DELETE' });
    return res.json();
  },

  // Scenarios
  async resetScenarios() {
    const res = await fetch(`${API_BASE}/scenarios/reset`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async verifyAllScenarios() {
    const res = await fetch(`${API_BASE}/scenarios/verify-all`, { headers: getAuthHeaders() });
    return res.json();
  },

  // System
  async getSystemStatus() {
    const res = await fetch(`${API_BASE}/system/status`);
    return res.json();
  }
};
