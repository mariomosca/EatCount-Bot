'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceStatus } from '@/lib/api';

interface ComplianceButtonsProps {
  currentStatus: ComplianceStatus | null;
  isLoading: boolean;
  onFull: () => void;
  onPartial: () => void;
  onOff: () => void;
}

export function ComplianceButtons({
  currentStatus,
  isLoading,
  onFull,
  onPartial,
  onOff,
}: ComplianceButtonsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* FULL */}
      <button
        onClick={onFull}
        disabled={isLoading}
        aria-label="Segna piano rispettato al 100%"
        className={cn(
          'flex flex-col items-center justify-center gap-2 min-h-[64px] rounded-xl border-2 px-4 py-4 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed',
          currentStatus === 'FULL'
            ? 'bg-compliance-full border-compliance-full text-white shadow-lg shadow-compliance-full/20'
            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-compliance-full hover:text-compliance-full'
        )}
      >
        <CheckCircle2 className="w-6 h-6" />
        <span>Piano OK</span>
        <span className="text-xs font-mono font-normal opacity-75">+5pt</span>
      </button>

      {/* PARTIAL */}
      <button
        onClick={onPartial}
        disabled={isLoading}
        aria-label="Segna deviazioni dal piano"
        className={cn(
          'flex flex-col items-center justify-center gap-2 min-h-[64px] rounded-xl border-2 px-4 py-4 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed',
          currentStatus === 'PARTIAL'
            ? 'bg-compliance-partial border-compliance-partial text-white shadow-lg shadow-compliance-partial/20'
            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-compliance-partial hover:text-compliance-partial'
        )}
      >
        <AlertCircle className="w-6 h-6" />
        <span>Deviazioni</span>
        <span className="text-xs font-mono font-normal opacity-75">+3pt</span>
      </button>

      {/* OFF */}
      <button
        onClick={onOff}
        disabled={isLoading}
        aria-label="Segna giornata off-plan"
        className={cn(
          'flex flex-col items-center justify-center gap-2 min-h-[64px] rounded-xl border-2 px-4 py-4 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed',
          currentStatus === 'OFF'
            ? 'bg-compliance-off border-compliance-off text-white shadow-lg shadow-compliance-off/20'
            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-compliance-off hover:text-compliance-off'
        )}
      >
        <XCircle className="w-6 h-6" />
        <span>Off Day</span>
        <span className="text-xs font-mono font-normal opacity-75">+0pt</span>
      </button>
    </div>
  );
}

// Badge di status compliance
interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

export function ComplianceStatusBadge({ status, className }: ComplianceStatusBadgeProps) {
  const config = {
    FULL: { label: 'Piano rispettato', icon: CheckCircle2, color: 'bg-compliance-full/20 text-compliance-full border-compliance-full/30' },
    PARTIAL: { label: 'Con deviazioni', icon: AlertCircle, color: 'bg-compliance-partial/20 text-compliance-partial border-compliance-partial/30' },
    OFF: { label: 'Off day', icon: XCircle, color: 'bg-compliance-off/20 text-compliance-off border-compliance-off/30' },
  };

  const { label, icon: Icon, color } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium',
        color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// Dialog per deviazioni
interface DeviationsDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (deviations: string) => void;
}

export function DeviationsDialog({ isOpen, isLoading, onClose, onSubmit }: DeviationsDialogProps) {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(text);
    setText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Descrivi le deviazioni dal piano"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4">
        <h2 className="text-lg font-semibold text-white mb-2">Descrivi le deviazioni</h2>
        <p className="text-sm text-slate-400 mb-4">
          Cosa non hai seguito del piano? Scrivi liberamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Es: cena con pizza, saltato colazione..."
            rows={4}
            autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-compliance-partial/50"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="flex-1 px-4 py-3 rounded-lg bg-compliance-partial text-white text-sm font-semibold hover:bg-compliance-partial/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salva deviazioni'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
