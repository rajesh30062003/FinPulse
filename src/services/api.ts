// FinPulse Frontend API Client with Smart URL Normalization, Session Persistence and Refresh Token Rotation

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getRefreshToken(): string | null {
  // Refresh token is stored strictly in HttpOnly cookie; never exposed in localStorage
  return null;
}

export function setRefreshToken(_token: string | null) {
  // Do not store long-lived refresh tokens in localStorage (enforced by security requirements)
}

export function clearTokens() {
  inMemoryAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('finpulse_refresh_token');
    localStorage.removeItem('finpulse_token');
  }
}

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
  const token = inMemoryAccessToken;

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// Mutex promise to deduplicate concurrent refresh calls
let isRefreshingPromise: Promise<any> | null = null;

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${base}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {})
  };

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      credentials: 'include', // Includes HttpOnly cookie in same-origin or cross-origin CORS
      headers
    });
  } catch (netErr: any) {
    console.error('API Network Error:', fullUrl, netErr);
    throw new Error(
      `Cannot connect to FinPulse backend at "${fullUrl}". ` +
      `If using a Render free instance, it may be waking up (please wait 30s) or verify your backend URL.`
    );
  }

  // Automatically attempt silent refresh on 401 Unauthorized for authenticated endpoints
  const isAuthEndpoint =
    cleanEndpoint.startsWith('/auth/login') ||
    cleanEndpoint.startsWith('/auth/register') ||
    cleanEndpoint.startsWith('/auth/refresh') ||
    cleanEndpoint.startsWith('/auth/logout') ||
    cleanEndpoint.startsWith('/auth/verify-email') ||
    cleanEndpoint.startsWith('/auth/resend-otp');

  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    try {
      if (!isRefreshingPromise) {
        isRefreshingPromise = api.refresh().finally(() => {
          isRefreshingPromise = null;
        });
      }
      await isRefreshingPromise;
      // Retry original request with refreshed access token
      return apiRequest<T>(endpoint, options, true);
    } catch (refreshErr) {
      clearTokens();
      const err = new Error('Session expired. Please log in again.');
      (err as any).status = 401;
      (err as any).code = 'SESSION_EXPIRED';
      throw err;
    }
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
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
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
  // Authentication & Session
  async login(payload: { email: string; password: string }) {
    const res = await apiRequest<{
      success: boolean;
      accessToken: string;
      refreshToken: string;
      user: any;
      message?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async register(payload: { name: string; email: string; password: string; confirmPassword?: string }) {
    return apiRequest<{
      success: boolean;
      message: string;
      email: string;
      expiresInSeconds: number;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async verifyEmail(payload: { email: string; otp: string }) {
    const res = await apiRequest<{
      success: boolean;
      message: string;
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async resendOtp(email: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      expiresInSeconds: number;
    }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async refresh() {
    const res = await apiRequest<{
      success: boolean;
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/auth/refresh', {
      method: 'POST'
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (e) {
      // Ignore logout errors and clean local tokens anyway
    } finally {
      clearTokens();
    }
  },

  async forgotPassword(email: string) {
    return apiRequest<{ success: boolean; message: string; expiresInSeconds?: number }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(payload: { email: string; otp: string; newPassword: string; confirmPassword?: string }) {
    return apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
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

  // SMTP Diagnostics
  async getSmtpStatus() {
    return apiRequest<{
      configured: boolean;
      host: string;
      port: number;
      secure: boolean;
      userMasked: string;
      from: string;
      verified: boolean;
      message: string;
      timestamp: string;
    }>('/system/smtp-status');
  },

  async testSmtpConnection(targetEmail?: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      messageId?: string;
      error?: string;
      code?: string;
      response?: string;
      details?: any;
    }>('/system/smtp-test', {
      method: 'POST',
      body: JSON.stringify({ email: targetEmail })
    });
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
