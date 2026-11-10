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
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) {
      clearFinancialData();
      return;
    }

    try {
      setIsLoading(true);
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
        api.getDashboardSummary().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getCash().catch(() => null),
        api.getCreditCards().catch(() => []),
        api.getTransactions().catch(() => []),
        api.getBudget().catch(() => null),
        api.getInvestments().catch(() => null),
        api.getFixedDeposits().catch(() => []),
        api.getEmergencyFund().catch(() => null),
        api.getSavingsGoals().catch(() => []),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 }))
      ]);

      if (sumData) setSummary(sumData);
      setAccounts(accData || []);
      setCash(cashData);
      setCreditCards(ccData || []);
      setTransactions(txData || []);
      setBudgetData(bgData);
      setInvestmentsData(invData);
      setFixedDeposits(fdData || []);
      setEmergencyFund(efData);
      setSavingsGoals(saveData || []);
      setNotifications(notifData?.notifications || []);
      setUnreadNotificationsCount(notifData?.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching financial datasets:', err);
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
        isLoading
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
