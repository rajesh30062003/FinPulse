import React, { useState } from 'react';
import { Mail, X, Send, Trash2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface MailboxModalProps {
  overrideOpen?: boolean;
  onOverrideClose?: () => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({ overrideOpen, onOverrideClose }) => {
  const { isMailboxOpen, setIsMailboxOpen, mailboxLogs, refreshAll, setIsAuthModalOpen } = useFinancial();
  const { verifyEmail } = useAuth();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isOpen = overrideOpen !== undefined ? overrideOpen : isMailboxOpen;
  const handleClose = () => {
    if (onOverrideClose) onOverrideClose();
    else setIsMailboxOpen(false);
  };

  if (!isOpen) return null;

  const currentEmail = mailboxLogs.find(m => m.id === selectedEmailId) || mailboxLogs[0];

  const handleTestSend = async (type: string) => {
    try {
      setIsSendingTest(true);
      setMessage(null);
      await api.sendTestMail(type);
      await refreshAll();
      setMessage(`Test ${type.replace('_', ' ')} email generated successfully!`);
    } catch (err: any) {
      setMessage('Failed to send test email: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearMailbox = async () => {
    if (confirm('Clear all sandbox email logs?')) {
      await api.clearMailbox();
      await refreshAll();
    }
  };

  const handleQuickVerify = async (otp?: string) => {
    if (!otp) return;
    const targetEmail = currentEmail?.to;
    if (!targetEmail) {
      setMessage('No recipient email found on message');
      return;
    }
    try {
      await verifyEmail(targetEmail, otp);
      setMessage('Account verified successfully via sandbox email link!');
      await refreshAll();
    } catch (err: any) {
      setMessage('Verification error: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Automated Email Sandbox & Mailbox Viewer
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {mailboxLogs.length} Messages
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect verification tokens, reset links, and scheduled reminder emails in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearMailbox}
              className="p-2 text-xs text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Clear Mailbox"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Test Trigger Actions Bar */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <span>Simulate Outgoing Emails:</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={isSendingTest}
                onClick={() => handleTestSend('verification')}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                + Verification OTP
              </button>
              <button
                disabled={isSendingTest}
                onClick={() => handleTestSend('password_reset')}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                + Password Reset
              </button>
              <button
                disabled={isSendingTest}
                onClick={() => handleTestSend('cc_bill_reminder')}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                + Credit Card Bill Alert
              </button>
              <button
                disabled={isSendingTest}
                onClick={() => handleTestSend('fd_maturity_reminder')}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                + FD Maturity Alert
              </button>
            </div>
          </div>

          {message && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Content Split: Email List & Email Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List Left Panel */}
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
            {mailboxLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No email dispatches yet.</p>
                <p className="text-[11px] mt-1 text-slate-500">Trigger a simulation above to test.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mailboxLogs.map(log => {
                  const isSelected = (currentEmail && currentEmail.id === log.id);
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedEmailId(log.id)}
                      className={`w-full text-left p-3.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-600'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono">{new Date(log.sentAt).toLocaleTimeString()}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          log.status === 'sent'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}>
                          {log.status === 'sent' ? 'SMTP' : 'Sandbox'}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {log.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {log.to}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email Body Right Panel */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-900 p-6">
            {currentEmail ? (
              <div className="max-w-2xl mx-auto w-full space-y-4">
                {/* Meta details */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">To:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{currentEmail.to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subject:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentEmail.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{new Date(currentEmail.sentAt).toLocaleString()}</span>
                  </div>

                  {/* Quick Action Button for OTP or Verify Link */}
                  {currentEmail.metadata?.otp && (
                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Detected Code:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono font-bold tracking-widest">
                          {currentEmail.metadata.otp}
                        </span>
                      </div>
                      {currentEmail.triggerType === 'verification' && (
                        <button
                          onClick={() => handleQuickVerify(currentEmail.metadata?.otp)}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Apply Verification Now
                        </button>
                      )}
                      {currentEmail.triggerType === 'password_reset' && (
                        <button
                          onClick={() => {
                            setIsMailboxOpen(false);
                            setIsAuthModalOpen(true);
                          }}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Reset Form
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Rendered HTML */}
                <div
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-xs text-slate-900"
                  dangerouslySetInnerHTML={{ __html: currentEmail.htmlBody }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Select an email from the left pane to view its template
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
