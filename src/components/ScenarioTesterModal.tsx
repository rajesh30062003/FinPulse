import React, { useState, useEffect } from 'react';
import { FlaskConical, CheckCircle2, XCircle, RotateCcw, X, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { api } from '../services/api';

export const ScenarioTesterModal: React.FC = () => {
  const { isScenarioModalOpen, setIsScenarioModalOpen, refreshAll } = useFinancial();
  const [report, setReport] = useState<any[]>([]);
  const [allPassed, setAllPassed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const runVerification = async () => {
    try {
      setLoading(true);
      const res = await api.verifyAllScenarios();
      setReport(res.testReport || []);
      setAllPassed(res.allPassed || false);
    } catch (err) {
      console.error('Audit verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isScenarioModalOpen) {
      runVerification();
    }
  }, [isScenarioModalOpen]);

  const handleReset = async () => {
    if (confirm('Reset entire ledger to pristine demo state with all 9 scenarios pre-loaded?')) {
      try {
        setResetting(true);
        await api.resetScenarios();
        await refreshAll();
        await runVerification();
      } finally {
        setResetting(false);
      }
    }
  };

  if (!isScenarioModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Mandatory Financial Scenarios Auditor
                {allPassed ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    All 9 Scenarios Passed
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Audit Running
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifies exact ledger rules: zero double-counting, correct balance updates, and liability tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={resetting}
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              Reset Demo Suite
            </button>
            <button
              onClick={() => setIsScenarioModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {report.map(item => (
            <div
              key={item.scenarioNumber}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-400">#{item.scenarioNumber}</span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{item.title}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Expected: </span>
                  {item.expected}
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span className="font-medium font-sans text-slate-700 dark:text-slate-300">Current Status: </span>
                  {item.actual}
                </div>
              </div>

              <div className="shrink-0 mt-1">
                {item.passed ? (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    Passed
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
                    <XCircle className="w-4 h-4" />
                    Needs Reset
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
