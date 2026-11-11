import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { SessionLoader } from './components/SessionLoader';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AddTransactionModal } from './components/AddTransactionModal';
import { CreditCardBillModal } from './components/CreditCardBillModal';
import { ScenarioTesterModal } from './components/ScenarioTesterModal';
import { AuthModal } from './components/AuthModal';

import { DashboardView } from './views/DashboardView';
import { IncomeView } from './views/IncomeView';
import { ExpensesView } from './views/ExpensesView';
import { BudgetAllocationView } from './views/BudgetAllocationView';
import { BankAccountsView } from './views/BankAccountsView';
import { CashManagementView } from './views/CashManagementView';
import { CreditCardsView } from './views/CreditCardsView';
import { CreditCardBillsView } from './views/CreditCardBillsView';
import { InvestmentsView } from './views/InvestmentsView';
import { FixedDepositsView } from './views/FixedDepositsView';
import { EmergencyFundView } from './views/EmergencyFundView';
import { SavingsGoalsView } from './views/SavingsGoalsView';
import { AnalyticsView } from './views/AnalyticsView';
import { TransactionsView } from './views/TransactionsView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeTab } = useFinancial();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'income':
        return <IncomeView />;
      case 'expenses':
        return <ExpensesView />;
      case 'budget':
        return <BudgetAllocationView />;
      case 'banks':
        return <BankAccountsView />;
      case 'cash':
        return <CashManagementView />;
      case 'credit-cards':
        return <CreditCardsView />;
      case 'credit-card-bills':
        return <CreditCardBillsView />;
      case 'investments':
        return <InvestmentsView />;
      case 'fixed-deposits':
        return <FixedDepositsView />;
      case 'emergency-fund':
        return <EmergencyFundView />;
      case 'savings-goals':
        return <SavingsGoalsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'transactions':
        return <TransactionsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen flex-1">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* Shared Modals */}
      <AddTransactionModal />
      <CreditCardBillModal />
      <ScenarioTesterModal />
      <AuthModal />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { sessionState, isAuthenticated } = useAuth();

  // 1. Session verification in progress: Render dedicated SessionLoader
  // Zero financial metrics, balances, or dashboard layouts are rendered
  if (sessionState === 'checking') {
    return <SessionLoader />;
  }

  // 2. Unauthenticated: Full-screen AuthView with zero financial data exposure
  if (!isAuthenticated || sessionState === 'unauthenticated') {
    return <AuthView />;
  }

  // 3. Authenticated: Mount FinancialProvider and MainLayout
  return (
    <FinancialProvider>
      <MainLayout />
    </FinancialProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
