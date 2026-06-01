/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (message: string, type: ToastType, duration?: number) => void;
const toastListeners = new Set<ToastListener>();

export const toast = {
  success: (msg: string, duration?: number) => toastListeners.forEach(l => l(msg, 'success', duration)),
  error: (msg: string, duration?: number) => toastListeners.forEach(l => l(msg, 'error', duration)),
  warning: (msg: string, duration?: number) => toastListeners.forEach(l => l(msg, 'warning', duration)),
  info: (msg: string, duration?: number) => toastListeners.forEach(l => l(msg, 'info', duration)),
  subscribe: (listener: ToastListener) => {
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white';
          let borderColor = 'border-slate-200';
          let textColor = 'text-slate-800';
          let iconColor = 'text-blue-500';
          let progressBg = 'bg-blue-500';
          let IconComp = Info;

          switch (toast.type) {
            case 'success':
              bgColor = 'bg-emerald-50';
              borderColor = 'border-emerald-200';
              textColor = 'text-emerald-900';
              iconColor = 'text-emerald-600';
              progressBg = 'bg-emerald-600';
              IconComp = CheckCircle;
              break;
            case 'error':
              bgColor = 'bg-rose-50';
              borderColor = 'border-rose-200';
              textColor = 'text-rose-950';
              iconColor = 'text-rose-600';
              progressBg = 'bg-rose-600';
              IconComp = AlertCircle;
              break;
            case 'warning':
              bgColor = 'bg-amber-50';
              borderColor = 'border-amber-200';
              textColor = 'text-amber-950';
              iconColor = 'text-amber-650';
              progressBg = 'bg-amber-600';
              IconComp = AlertTriangle;
              break;
            case 'info':
              bgColor = 'bg-blue-50';
              borderColor = 'border-blue-200';
              textColor = 'text-blue-950';
              iconColor = 'text-blue-600';
              progressBg = 'bg-blue-600';
              IconComp = Info;
              break;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`pointer-events-auto flex flex-col w-full rounded-xl border ${borderColor} ${bgColor} shadow-lg overflow-hidden border-l-4`}
              style={{ borderLeftColor: 'currentColor', color: iconColor }}
            >
              <div className="flex items-start p-4 gap-3">
                <span className="shrink-0 mt-0.5" style={{ color: 'inherit' }}>
                  <IconComp className="w-5 h-5" />
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-sans font-semibold leading-relaxed whitespace-pre-wrap ${textColor}`}>
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => onClose(toast.id)}
                  className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar animation for automatic timeout */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
                className={`h-1 ${progressBg}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
