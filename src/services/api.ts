// FinPulse Frontend API Client with Smart URL Normalization and Safe Response Handling

export function normalizeApiUrl(rawUrl: string): string {
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(clean)) {
    // If user provided base URL without /api, append /api
    if (!clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    return clean;
  }
  if (!clean.startsWith('/')) {
    clean = `/${clean}`;
  }
  return clean;
}

export function getApiBase(): string {
  // 1. Check user override stored in browser
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('finpulse_api_url');
    if (custom && custom.trim()) {
      return normalizeApiUrl(custom.trim());
    }
  }

  // 2. Check Vite environment variable VITE_API_URL
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }

  // 3. Fallback for same-origin dev server
  return '/api';
}

export function setCustomApiUrl(url: string | null) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('finpulse_api_url', url.trim());
    } else {
      localStorage.removeItem('finpulse_api_url');
    }
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('finpulse_token') : null;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${base}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {})
  };

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers
    });
  } catch (netErr: any) {
    console.error('API Network Error:', fullUrl, netErr);
    throw new Error(
      `Cannot connect to FinPulse backend at "${fullUrl}". ` +
      `If using a Render free instance, it may be waking up (please wait 30s) or verify your backend URL.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (parseErr: any) {
      throw new Error(`Failed to parse backend JSON response: ${parseErr.message}`);
    }
  } else {
    const text = await res.text();
    const trimmed = text.trim();

    // Check if response is HTML
    if (trimmed.startsWith('<')) {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
      const isRelative = !base.startsWith('http://') && !base.startsWith('https://');

      let explanation = `Backend returned HTML instead of JSON (HTTP ${res.status}). `;
      if (isVercel && isRelative) {
        explanation += `Your website is hosted on Vercel but trying to call "${fullUrl}" locally. Set VITE_API_URL to your Render backend URL (e.g. https://your-backend.onrender.com) in Vercel settings, or configure it in the login modal.`;
      } else {
        explanation += `The request reached "${fullUrl}", which returned an HTML document. Please verify your Render backend URL and ensure the server is online.`;
      }
      throw new Error(explanation);
    }

    try {
      data = JSON.parse(trimmed);
    } catch {
      data = { message: trimmed };
    }
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request to ${cleanEndpoint} failed (Status ${res.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
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
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async register(payload: { name: string; email: string; password: string }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async verifyEmail(payload: { email: string; token?: string; otp?: string }) {
    return apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async resendVerification(email: string) {
    return apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async forgotPassword(email: string) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(payload: { email: string; token?: string; otp?: string; newPassword: string }) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMe() {
    return apiRequest('/auth/me');
  },

  async updateProfile(data: any) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Dashboard
  async getDashboardSummary() {
    return apiRequest('/dashboard/summary');
  },

  // Accounts
  async getAccounts() {
    return apiRequest('/accounts');
  },

  async createAccount(data: any) {
    return apiRequest('/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Cash
  async getCash() {
    return apiRequest('/cash');
  },

  async adjustCash(data: { newBalanceInPaise: number; reason: string }) {
    return apiRequest('/cash/adjust', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Credit Cards
  async getCreditCards() {
    return apiRequest('/credit-cards');
  },

  async createCreditCard(data: any) {
    return apiRequest('/credit-cards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async payCreditCardBill(data: { creditCardId: string; sourceAccountId: string; paymentAmountInPaise: number; notes?: string }) {
    return apiRequest('/credit-cards/pay-bill', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Transactions
  async getTransactions(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/transactions${q}`);
  },

  async createTransaction(data: any) {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTransaction(id: string, data: any) {
    return apiRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteTransaction(id: string) {
    return apiRequest(`/transactions/${id}`, {
      method: 'DELETE'
    });
  },

  // Budget
  async getBudget() {
    return apiRequest('/budget');
  },

  async updateBudget(data: any) {
    return apiRequest('/budget', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Investments
  async getInvestments() {
    return apiRequest('/investments');
  },

  async createInvestment(data: any) {
    return apiRequest('/investments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateInvestmentValuation(id: string, currentValueInPaise: number) {
    return apiRequest(`/investments/${id}/valuation`, {
      method: 'PUT',
      body: JSON.stringify({ currentValueInPaise })
    });
  },

  async deleteInvestment(id: string) {
    return apiRequest(`/investments/${id}`, {
      method: 'DELETE'
    });
  },

  // Fixed Deposits
  async getFixedDeposits() {
    return apiRequest('/fixed-deposits');
  },

  async createFixedDeposit(data: any) {
    return apiRequest('/fixed-deposits', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteFixedDeposit(id: string) {
    return apiRequest(`/fixed-deposits/${id}`, {
      method: 'DELETE'
    });
  },

  // Emergency Fund
  async getEmergencyFund() {
    return apiRequest('/emergency-fund');
  },

  async updateEmergencyTarget(targetAmountInPaise: number) {
    return apiRequest('/emergency-fund/target', {
      method: 'POST',
      body: JSON.stringify({ targetAmountInPaise })
    });
  },

  async depositEmergencyFund(data: { amountInPaise: number; sourceAccountId: string; notes?: string }) {
    return apiRequest('/emergency-fund/deposit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async withdrawEmergencyFund(data: { amountInPaise: number; destinationAccountId: string; notes?: string }) {
    return apiRequest('/emergency-fund/withdraw', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Savings
  async getSavingsGoals() {
    return apiRequest('/savings-goals');
  },

  async createSavingsGoal(data: any) {
    return apiRequest('/savings-goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async contributeSavingsGoal(id: string, data: { amountInPaise: number; sourceAccountId: string }) {
    return apiRequest(`/savings-goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteSavingsGoal(id: string) {
    return apiRequest(`/savings-goals/${id}`, {
      method: 'DELETE'
    });
  },

  // Notifications
  async getNotifications() {
    return apiRequest('/notifications');
  },

  async markNotificationRead(id: string) {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'POST'
    });
  },

  async markAllNotificationsRead() {
    return apiRequest('/notifications/mark-all-read', {
      method: 'POST'
    });
  },

  async triggerReminderCheck() {
    return apiRequest('/notifications/trigger-check', {
      method: 'POST'
    });
  },

  // Mailbox
  async getMailbox() {
    return apiRequest('/mailbox');
  },

  async sendTestMail(type: string) {
    return apiRequest('/mailbox/test-send', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  },

  async clearMailbox() {
    return apiRequest('/mailbox', { method: 'DELETE' });
  },

  // Scenarios
  async resetScenarios() {
    return apiRequest('/scenarios/reset', {
      method: 'POST'
    });
  },

  async verifyAllScenarios() {
    return apiRequest('/scenarios/verify-all');
  },

  // System Health
  async getHealth() {
    return apiRequest('/health');
  },

  async getSystemStatus() {
    return apiRequest('/system/status');
  }
};
