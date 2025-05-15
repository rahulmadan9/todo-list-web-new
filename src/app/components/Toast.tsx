"use client";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "info", open, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  let bg = "bg-state-info";
  if (type === "success") bg = "bg-state-success";
  if (type === "error") bg = "bg-state-error";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-full px-4`}
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`flex items-center gap-3 ${bg} text-text-100 shadow-3 rounded-lg px-4 py-3 animate-fade-in-out`}
        style={{ pointerEvents: "auto" }}
      >
        <span className="flex-1 text-base">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 px-2 py-1 rounded-full bg-bg-700 text-text-200 hover:bg-bg-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-bg-900 text-sm font-medium transition-all"
          aria-label="Dismiss notification"
          style={{ pointerEvents: "auto" }}
        >
          ×
        </button>
      </div>
      <style jsx>{`
        .animate-fade-in-out {
          animation: fadeInOut 0.4s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 