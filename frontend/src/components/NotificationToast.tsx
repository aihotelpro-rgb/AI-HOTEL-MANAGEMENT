'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Sparkles, X, Volume2 } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type?: 'success' | 'alert' | 'info';
  timestamp?: string;
}

// Synthesize pleasant dual-tone chime sound via Web Audio API
export const playNotificationChime = (type: 'success' | 'alert' | 'info' = 'info') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq1 = type === 'alert' ? 587.33 : type === 'success' ? 880 : 659.25; // D5, A5, E5
    const freq2 = type === 'alert' ? 880 : type === 'success' ? 1174.66 : 880; // A5, D6, A5

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq2, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn('Audio chime playback omitted:', e);
  }
};

interface NotificationToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function NotificationToastContainer({ toasts, onDismiss }: NotificationToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isAlert = toast.type === 'alert';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-5 flex items-start gap-3.5 ${
              isAlert
                ? 'bg-red-950/90 border-red-500/60 text-red-100 shadow-red-950/40'
                : isSuccess
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/40'
                : 'bg-neutral-900/90 border-amber-500/50 text-neutral-100 shadow-amber-950/20'
            }`}
          >
            {/* Icon badge */}
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
              isAlert
                ? 'bg-red-900/60 border-red-500/40 text-red-400'
                : isSuccess
                ? 'bg-emerald-900/60 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
            }`}>
              {isAlert ? <AlertTriangle className="h-4 w-4" /> : isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold tracking-tight truncate">{toast.title}</h4>
                <span className="text-[9px] text-neutral-400 font-mono ml-2">
                  {toast.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">{toast.description}</p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition shrink-0"
              title="Close Notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
