import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  IDashboardSummary,
  IBankAccount,
  ICashWallet,
  ICreditCard,
  ITransaction,
  IFixedDeposit,
  IEmergencyFund,
  ISavingsGoal,
  INotification
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface FinancialContextType {
  summary: IDashboardSummary | null;
  accounts: IBankAccount[];
  cash: ICashWallet | null;
  creditCards: ICreditCard[];
  transactions: ITransaction[];
  budgetData: any;
  investmentsData: any;
  fixedDeposits: IFixedDeposit[];
  emergencyFund: IEmergencyFund | null;
  savingsGoals: ISavingsGoal[];
  notifications: INotification[];
  unreadNotificationsCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAddTxOpen: boolean;
  setIsAddTxOpen: (open: boolean) => void;
  addTxDefaultType?: string;
  setAddTxDefaultType: (type?: string) => void;
  isPayBillOpen: boolean;
  setIsPayBillOpen: (open: boolean) => void;
  selectedCardForBill: ICreditCard | null;
  setSelectedCardForBill: (card: ICreditCard | null) => void;
  isScenarioModalOpen: boolean;
  setIsScenarioModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  refreshAll: () => Promise<void>;
  clearFinancialData: () => void;
  isLoading: boolean;
  fetchError: string | null;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionState, isAuthenticated } = useAuth();

  const [summary, setSummary] = useState<IDashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<IBankAccount[]>([]);
  const [cash, setCash] = useState<ICashWallet | null>(null);
  const [creditCards, setCreditCards] = useState<ICreditCard[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [investmentsData, setInvestmentsData] = useState<any>(null);
  const [fixedDeposits, setFixedDeposits] = useState<IFixedDeposit[]>([]);
  const [emergencyFund, setEmergencyFund] = useState<IEmergencyFund | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<ISavingsGoal[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modals
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [addTxDefaultType, setAddTxDefaultType] = useState<string | undefined>(undefined);
  const [isPayBillOpen, setIsPayBillOpen] = useState(false);
  const [selectedCardForBill, setSelectedCardForBill] = useState<ICreditCard | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const clearFinancialData = useCallback(() => {
    setSummary(null);
    setAccounts([]);
    setCash(null);
    setCreditCards([]);
    setTransactions([]);
    setBudgetData(null);
    setInvestmentsData(null);
    setFixedDeposits([]);
    setEmergencyFund(null);
    setSavingsGoals([]);
    setNotifications([]);
    setUnreadNotificationsCount(0);
    setFetchError(null);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) {
      clearFinancialData();
      return;
    }

    try {
      setIsLoading(true);
      let errorOccurred = false;

      const safeFetch = async <T,>(fn: () => Promise<T>, name: string): Promise<T | null> => {
        try {
          return await fn();
        } catch (err: any) {
          console.error(`Failed to fetch ${name}:`, err);
          errorOccurred = true;
          return null;
        }
      };

      const [
        sumData,
        accData,
        cashData,
        ccData,
        txData,
        bgData,
        invData,
        fdData,
        efData,
        saveData,
        notifData
      ] = await Promise.all([
        safeFetch(() => api.getDashboardSummary(), 'dashboard summary'),
        safeFetch(() => api.getAccounts(), 'bank accounts'),
        safeFetch(() => api.getCash(), 'cash wallet'),
        safeFetch(() => api.getCreditCards(), 'credit cards'),
        safeFetch(() => api.getTransactions(), 'transactions'),
        safeFetch(() => api.getBudget(), 'budget'),
        safeFetch(() => api.getInvestments(), 'investments'),
        safeFetch(() => api.getFixedDeposits(), 'fixed deposits'),
        safeFetch(() => api.getEmergencyFund(), 'emergency fund'),
        safeFetch(() => api.getSavingsGoals(), 'savings goals'),
        safeFetch(() => api.getNotifications(), 'notifications')
      ]);

      if (errorOccurred) {
        setFetchError('Some financial services could not be reached. Retaining existing records.');
      } else {
        setFetchError(null);
      }

      // CRITICAL: Only update state if data was successfully fetched (not null)!
      // Do NOT convert failed API calls or database errors into empty arrays!
      if (sumData !== null) setSummary(sumData);
      if (accData !== null) setAccounts(accData);
      if (cashData !== null) setCash(cashData);
      if (ccData !== null) setCreditCards(ccData);
      if (txData !== null) setTransactions(txData);
      if (bgData !== null) setBudgetData(bgData);
      if (invData !== null) setInvestmentsData(invData);
      if (fdData !== null) setFixedDeposits(fdData);
      if (efData !== null) setEmergencyFund(efData);
      if (saveData !== null) setSavingsGoals(saveData);
      if (notifData !== null) {
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching financial datasets:', err);
      setFetchError('An unexpected error occurred while synchronizing financial records.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, clearFinancialData]);

  // Sync state when session state changes
  useEffect(() => {
    if (sessionState === 'authenticated') {
      refreshAll();
    } else {
      clearFinancialData();
    }
  }, [sessionState, refreshAll, clearFinancialData]);

  return (
    <FinancialContext.Provider
      value={{
        summary,
        accounts,
        cash,
        creditCards,
        transactions,
        budgetData,
        investmentsData,
        fixedDeposits,
        emergencyFund,
        savingsGoals,
        notifications,
        unreadNotificationsCount,
        activeTab,
        setActiveTab,
        isAddTxOpen,
        setIsAddTxOpen,
        addTxDefaultType,
        setAddTxDefaultType,
        isPayBillOpen,
        setIsPayBillOpen,
        selectedCardForBill,
        setSelectedCardForBill,
        isScenarioModalOpen,
        setIsScenarioModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        refreshAll,
        clearFinancialData,
        isLoading,
        fetchError
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial must be used within FinancialProvider');
  return context;
};
