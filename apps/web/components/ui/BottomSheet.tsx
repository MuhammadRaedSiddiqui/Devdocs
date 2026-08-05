"use client";
import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/30 z-40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-vellum border-t border-vellum-border rounded-t-2xl z-40 max-h-[75vh] overflow-y-auto transition-transform duration-200 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-vellum-border" />
        </div>
        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <span className="font-serif-heading text-[15px] text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint text-lg leading-none hover:text-ink"
          >
            &times;
          </button>
        </div>
        {/* Content */}
        <div className="px-0 pb-5">
          {children}
        </div>
      </div>
    </>
  );
}
