"use client";
import { useToastState } from "@/lib/toast";

export function ToastStack() {
  const { toasts, dismiss } = useToastState();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 bg-ink text-vellum text-xs px-4 py-2 rounded-lg animate-toast-in ${
            t.type === "success" ? "border-l-[3px] border-l-[#1D9E75]" :
            t.type === "error" ? "border-l-[3px] border-l-terracotta" : ""
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-vellum/60 hover:text-vellum text-sm leading-none ml-2"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
