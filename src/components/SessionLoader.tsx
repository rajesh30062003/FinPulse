import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export const SessionLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white font-sans px-4 select-none">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
      <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Animated Security Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-blue-400/30">
            <ShieldCheck className="w-10 h-10 text-white animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-blue-500/20 animate-ping pointer-events-none"></div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-emerald-500 flex items-center justify-center">
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

        {/* Brand & Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">Fin<span className="text-blue-500">Pulse</span></span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Vault
            </span>
          </div>
          <h2 className="text-sm font-semibold text-slate-300">
            Securing Financial Session
          </h2>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Verifying cryptographic credentials and establishing isolated tenant connection...
          </p>
        </div>

        {/* Loading indicator bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full animate-indeterminate"></div>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Zero-Knowledge Privacy Active</span>
        </div>
      </div>
    </div>
  );
};
