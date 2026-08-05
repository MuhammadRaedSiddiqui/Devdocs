"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++nextId}`;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      if (next.length > 3) return next.slice(next.length - 3);
      return next;
    });
    const timer = setTimeout(() => dismiss(id), 2200);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: (message: string, type?: ToastType) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return { toast: ctx.toast };
}

export function useToastState() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastState must be used within ToastProvider");
  return ctx;
}
